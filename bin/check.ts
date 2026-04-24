import fs from "node:fs";
import nodePath from "node:path";
import process from "node:process";
import { loadAsBlob } from "esm-resource";
import deepEqual from "deep-equal";

const args = process.argv.slice(2);

if (args.length === 0) {
  throw Error(`please provide a folder to check`);
} else if (args.length > 1) {
  throw Error(`too many arguments, only provide folder to check`);
}

const folderToCheck = args[0];

const filesToCheck = [
  ".editorconfig",
  "tsconfig.json",
  "eslint.config.js",
  ".github/workflows/ci.yml",
  ".github/workflows/npm-publish.yml",
];

let ourFileContents: { [key: string]: string } = {};

type TLoadResult = {
  error: Error,
  content: undefined;
} | {
  error: undefined,
  content: string
};

const reportProblem = ({
  problem,
  solution
}: {
  problem: string;
  solution: string;
}) => {
  console.error(JSON.stringify({ problem, solution }, null, 2));
};

const formatValue = (value: unknown): string => {
  if (value === undefined) {
    return "<missing>";
  }

  return typeof value === "string" ? value : JSON.stringify(value);
};

const reportMissingArtifact = ({
  artifact,
  solution,
}: {
  artifact: string;
  solution: string;
}) => {
  reportProblem({
    problem: `${artifact} is missing.`,
    solution,
  });
};

const reportArtifactMismatch = ({
  artifact,
  actual,
  expected,
  solution,
}: {
  artifact: string;
  actual: unknown;
  expected: unknown;
  solution: string;
}) => {
  reportProblem({
    problem: `${artifact} does not match the boilerplate. Expected ${formatValue(expected)} but found ${formatValue(actual)}.`,
    solution,
  });
};

const reportInvalidJson = ({ filename }: { filename: string }) => {
  reportProblem({
    problem: `${filename} exists but is not valid JSON, so the checker cannot inspect it.`,
    solution: `Fix the JSON syntax in ${filename} so it parses successfully, then rerun the checker.`,
  });
};

const loadOurFileAsUtf8String = async ({ filename }: { filename: string }): Promise<TLoadResult> => {
  try {
    const ourFileAsBlob = await loadAsBlob({ importMeta: import.meta, filepath: nodePath.join("..", filename) });
    const content = await ourFileAsBlob.text();

    return {
      error: undefined,
      content,
    };
  } catch (ex) {
    return {
      error: ex as Error,
      content: undefined,
    };
  }
};

type TLoadTheirFileResult = {
  error: Error,
  content: undefined;
} | {
  error: undefined,
  content: string
} | {
  error: undefined,
  content: undefined;
};

// eslint-disable-next-line complexity
const loadTheirFileAsUtf8String = async ({ filename }: { filename: string }): Promise<TLoadTheirFileResult> => {
  const fullPath = nodePath.resolve(folderToCheck, filename);

  try {
    const content = await fs.promises.readFile(fullPath, "utf-8");

    return {
      error: undefined,
      content,
    };
  } catch (ex: unknown) {

    if (typeof ex === "object" && ex !== null && "code" in ex && (ex as { code: unknown }).code === "ENOENT") {
      return {
        error: undefined,
        content: undefined,
      };
    }

    return {
      error: ex as Error,
      content: undefined,
    };
  }
};

type TTryParseJsonResult = {
  error: Error,
  content: undefined;
} | {
  error: undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
};

const tryParseJson = ({ jsonString }: { jsonString: string }): TTryParseJsonResult => {
  try {
    const content = JSON.parse(jsonString);

    return {
      error: undefined,
      content,
    };
  } catch (ex) {
    return {
      error: ex as Error,
      content: undefined,
    };
  }
};

// eslint-disable-next-line max-statements, complexity
const main = async (): Promise<{ exitCode: number }> => {

  for (const filename of filesToCheck) {

    const { error, content } = await loadOurFileAsUtf8String({ filename });
    if (error !== undefined) {
      throw Error(`failed to load our file "${filename}"`, { cause: error });
    }

    ourFileContents = {
      ...ourFileContents,
      [filename]: content,
    };
  }

  const {
    error: packageJsonError,
    content: ourPackageJsonAsString
  } = await loadOurFileAsUtf8String({ filename: "package.json" });

  if (packageJsonError !== undefined) {
    throw Error(`package.json is missing in checker`, { cause: packageJsonError });
  }

  const ourPackageJson = JSON.parse(ourPackageJsonAsString);

  const {
    error: packageJsonNpmError,
    content: ourPackageJsonNpmAsString
  } = await loadOurFileAsUtf8String({ filename: "package.npm.json" });

  if (packageJsonNpmError !== undefined) {
    throw Error(`package.npm.json is missing in checker`, { cause: packageJsonNpmError });
  }

  const ourPackageJsonNpm = JSON.parse(ourPackageJsonNpmAsString);

  for (const filename of filesToCheck) {

    const {
      error: loadTheirFileError,
      content: theirContent
    } = await loadTheirFileAsUtf8String({ filename });

    if (loadTheirFileError !== undefined) {
      throw Error(`failed to load their file "${filename}"`, { cause: loadTheirFileError });
    }

    if (theirContent === undefined) {
      reportMissingArtifact({
        artifact: filename,
        solution: [
          `Add ${filename} to the checked package using the boilerplate version from this repository,`,
          `or copy over the required contents so the file exists and matches.`,
        ].join(" "),
      });
      continue;
    }

    const ourContent = ourFileContents[filename];

    if (theirContent.trim() !== ourContent.trim()) {
      reportArtifactMismatch({
        artifact: filename,
        actual: theirContent.trim(),
        expected: ourContent.trim(),
        solution: `Update ${filename} in the checked package so its contents match the boilerplate version from this repository.`,
      });
    }
  }

  const {
    error: theirPackageJsonReadError,
    content: theirPackageJsonAsString
  } = await loadTheirFileAsUtf8String({ filename: "package.json" });

  if (theirPackageJsonReadError !== undefined) {
    throw Error(`failed to read their package.json`, { cause: theirPackageJsonReadError });
  }

  if (theirPackageJsonAsString === undefined) {
    reportMissingArtifact({
      artifact: "package.json",
      solution: [
        `Create package.json in the checked package with an empty JSON then rerun the checker`,
      ].join(" "),
    });
    return { exitCode: 1 };
  }

  const {
    error: theirPackageJsonParseError,
    content: theirPackageJson
  } = tryParseJson({ jsonString: theirPackageJsonAsString });

  if (theirPackageJsonParseError !== undefined) {
    reportInvalidJson({ filename: "package.json" });
    return { exitCode: 1 };
  }

  const {
    error: theirPackageJsonNpmReadError,
    content: theirPackageJsonNpmAsString
  } = await loadTheirFileAsUtf8String({ filename: "package.npm.json" });

  if (theirPackageJsonNpmReadError !== undefined) {
    throw Error(`failed to read their package.npm.json`, { cause: theirPackageJsonNpmReadError });
  }

  if (theirPackageJsonNpmAsString === undefined) {
    reportMissingArtifact({
      artifact: "package.npm.json",
      solution: [
        `Create package.npm.json in the checked package with an empty JSON then rerun the checker`,
      ].join(" "),
    });
    return { exitCode: 1 };
  }

  const {
    error: theirPackageJsonNpmParseError,
    content: theirPackageJsonNpm
  } = tryParseJson({ jsonString: theirPackageJsonNpmAsString });

  if (theirPackageJsonNpmParseError !== undefined) {
    reportInvalidJson({ filename: "package.npm.json" });
    return { exitCode: 1 };
  }

  const checkDevDependency = ({ dependencyName }: { dependencyName: string }) => {

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      theirs: (theirPackageJson as any)?.devDependencies?.[dependencyName],
      ours: ourPackageJson.devDependencies[dependencyName],
    };
  };

  const devDependenciesToCheck = [
    "deno-node",
    "@eslint/js",
    "typescript",
    "typescript-eslint",
    "@types/node",
    "@k13engineering/releasetool",
  ];

  const optionalDevDependenciesToCheck = [
    "c8",
    "npm-check-updates"
  ];

  for (const dependencyName of devDependenciesToCheck) {
    const { theirs, ours } = checkDevDependency({ dependencyName });

    if (theirs !== ours) {
      reportArtifactMismatch({
        artifact: `devDependency ${dependencyName}`,
        actual: theirs,
        expected: ours,
        solution: [
          `Set devDependencies.${dependencyName} in package.json to ${formatValue(ours)}`,
          `so the checked package uses the same toolchain version as this boilerplate.`,
        ].join(" "),
      });
    }
  }

  for (const dependencyName of optionalDevDependenciesToCheck) {
    const { theirs, ours } = checkDevDependency({ dependencyName });

    if (theirs === undefined) {
      continue;
    }

    if (theirs !== ours) {
      reportArtifactMismatch({
        artifact: `optional devDependency ${dependencyName}`,
        actual: theirs,
        expected: ours,
        solution: [
          `If the checked package keeps ${dependencyName}, align`,
          `devDependencies.${dependencyName} with the boilerplate version ${formatValue(ours)}.`,
          `Otherwise remove the dependency from the checked package.`,
        ].join(" "),
      });
    }
  }

  const checkDependency = ({ dependencyName }: { dependencyName: string }) => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      theirs: (theirPackageJson as any)?.dependencies?.[dependencyName],
      ours: ourPackageJson.dependencies[dependencyName],
    };
  };

  const dependenciesToCheck: string[] = [

  ];

  for (const dependencyName of dependenciesToCheck) {
    const { theirs, ours } = checkDependency({ dependencyName });

    if (theirs !== ours) {
      reportArtifactMismatch({
        artifact: `dependency ${dependencyName}`,
        actual: theirs,
        expected: ours,
        solution: [
          `Set dependencies.${dependencyName} in package.json to ${formatValue(ours)}`,
          `so the checked package stays aligned with the boilerplate runtime dependency set.`,
        ].join(" "),
      });
    }
  }


  if (!deepEqual(theirPackageJsonNpm?.files, ourPackageJsonNpm.files)) {
    reportArtifactMismatch({
      artifact: "package.npm.json files",
      actual: theirPackageJsonNpm?.files,
      expected: ourPackageJsonNpm.files,
      solution: `Update package.npm.json files so the publishable file list matches the boilerplate exactly.`,
    });
  }

  if (!deepEqual(theirPackageJsonNpm?.publishConfig, ourPackageJsonNpm.publishConfig)) {
    reportArtifactMismatch({
      artifact: "package.npm.json publishConfig",
      actual: theirPackageJsonNpm?.publishConfig,
      expected: ourPackageJsonNpm.publishConfig,
      solution: `Update package.npm.json publishConfig so the npm publishing settings match the boilerplate configuration.`,
    });
  }

  const requiredPackageJsonNpmFields = [
    "name",
    "author",
    "description",
    "main",
    "repository",
    "author",
    "bugs",
    "homepage",
    "license",
  ];

  requiredPackageJsonNpmFields.forEach((field) => {
    if (theirPackageJsonNpm[field] === undefined) {
      reportMissingArtifact({
        artifact: `package.npm.json field ${field}`,
        solution: `Add the ${field} field to package.npm.json and populate it with the package-specific value required for publishing.`,
      });
    }
  });

  const forbiddenPackageJsonFields = [
    "name",
    "author",
    "description",
    "repository",
    "author",
    "bugs",
    "homepage",
    "license",
  ];

  forbiddenPackageJsonFields.forEach((field) => {
    if (theirPackageJson[field] !== undefined) {
      reportArtifactMismatch({
        artifact: `package.json field ${field}`,
        actual: theirPackageJson[field],
        expected: undefined,
        solution: `Remove the ${field} field from package.json, as it should be part of package.npm.json instead`,
      });
    }
  });

  const requiredScripts = [
    "test",
    "build",
    "lint",
    "type-check",
    "update-deps",
  ];

  if (theirPackageJson.scripts === undefined) {
    reportMissingArtifact({
      artifact: "package.json scripts",
      solution: [
        `Add a scripts object to package.json and define the standard boilerplate scripts`,
        `so the package can be built, linted, tested, and maintained consistently.`,
      ].join(" "),
    });
  } else {
    requiredScripts.forEach((script) => {
      if (theirPackageJson.scripts[script] === undefined) {
        reportMissingArtifact({
          artifact: `package.json script ${script}`,
          solution: `Add scripts.${script} to package.json using the standard command from this boilerplate.`,
        });
      }
    });
  }

  return {
    exitCode: 0,
  };
};

const { exitCode } = await main();
process.exitCode = exitCode;
