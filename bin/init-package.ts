import nodeFs from "node:fs";
import { findGitOriginOfRepo } from "../lib/util.ts";
import { createInitWizard, type TWizardData } from "../lib/init-wizard.ts";
import nodePath from "node:path";
import nodeUrl from "node:url";

const args = process.argv.slice(2);

if (args.length === 0) {
  throw Error(`please provide a folder to initialize a package in`);
} else if (args.length > 1) {
  throw Error(`too many arguments, only provide folder to check`);
}

const packageFolder = args[0];

if (!nodeFs.existsSync(packageFolder)) {
  throw Error(`folder ${packageFolder} does not exist`);
}

const gitRemoteUrl = findGitOriginOfRepo({ repoDirectory: packageFolder });
console.log({ gitRemoteUrl });

let suggestions: TWizardData = {
  packageName: "@k13engineering/my-new-package",
  description: "A description of my new package",
  authorName: "Simon Kadisch",
  authorEmail: "simon.kadisch@k13-engineering.at",
  license: "LGPL 2.1",
  main: "lib/index.ts",
  mainNpm: "dist/lib/index.js",
  repositoryUrl: "https://github.com/k13-engineering/node-boilerplate.git",
  bugsUrl: "https://github.com/k13-engineering/node-boilerplate/issues",
  homepageUrl: "https://github.com/k13-engineering/node-boilerplate#readme",
};


if (gitRemoteUrl !== undefined) {

  const wellKnownPrefixes = [
    "git@github.com:k13-engineering/"
  ];

  const prefix = wellKnownPrefixes.find((p) => {
    return gitRemoteUrl.startsWith(p);
  });

  if (prefix !== undefined) {
    const repoName = gitRemoteUrl.substring(prefix.length);
    console.log(`Inferred repo name: ${repoName}`);

    const defaultGitRepoPostfix = ".git";

    if (repoName.endsWith(defaultGitRepoPostfix)) {
      const cleanRepoName = repoName.substring(0, repoName.length - defaultGitRepoPostfix.length);
      console.log(`Clean repo name: ${cleanRepoName}`);

      const nodePrefix = "node-";

      if (cleanRepoName.startsWith(nodePrefix)) {
        const packageName = cleanRepoName.substring(nodePrefix.length);
        console.log(`Inferred package name: ${packageName}`);

        suggestions = {
          ...suggestions,
          packageName: `@k13engineering/${packageName}`,
        };
      }

      suggestions = {
        ...suggestions,
        repositoryUrl: `https://github.com/k13-engineering/${repoName}`,
        bugsUrl: `https://github.com/k13-engineering/${cleanRepoName}/issues`,
        homepageUrl: `https://github.com/k13-engineering/${cleanRepoName}#readme`,
      };
    }
  }
}

console.log({ suggestions });

const wizard = createInitWizard({ suggestions });

const answers = await wizard.prompt();

console.log({ answers });

const githubHiddenFolderPath = nodePath.join(packageFolder, ".github");
if (nodeFs.existsSync(githubHiddenFolderPath)) {
  throw Error(`.github folder already exists in ${packageFolder}`);
}

const ourScriptPath = nodeUrl.fileURLToPath(import.meta.url);
const ourScriptDir = nodePath.dirname(ourScriptPath);
const boilerplatePackageFolder = nodePath.dirname(ourScriptDir);

const boilerplateGithubFolder = nodePath.join(boilerplatePackageFolder, ".github");

nodeFs.cpSync(boilerplateGithubFolder, githubHiddenFolderPath, { recursive: true });

const boilerplatePackageJsonPath = nodePath.join(boilerplatePackageFolder, "package.json");
const boilerplatePackageJsonRaw = nodeFs.readFileSync(boilerplatePackageJsonPath, { encoding: "utf-8" });
const boilerplatePackageJson = JSON.parse(boilerplatePackageJsonRaw);

// eslint-disable-next-line complexity
const findDependencyVersion = ({ dependencyName }: { dependencyName: string }) => {
  const depVersionInDependencies = boilerplatePackageJson.dependencies?.[dependencyName];
  if (depVersionInDependencies !== undefined) {
    return depVersionInDependencies;
  }

  const depVersionInDevDependencies = boilerplatePackageJson.devDependencies?.[dependencyName];
  if (depVersionInDevDependencies !== undefined) {
    return depVersionInDevDependencies;
  }

  throw Error(`could not find version for dependency ${dependencyName} in boilerplate package.json`);
};

let packageJson = {
  type: "module",
  main: answers.main,
  scripts: {
    build: "rm -rf dist/ && deno-node-build --root . --out dist/ --entry lib/index.ts",
    test: "c8 --reporter lcov --reporter html --reporter text --all --src lib/ node test/index.ts",
    lint: "eslint ."
  },
  devDependencies: {
    // filled below
  },
  dependencies: {
  }
};

const devDependenciesToAdd = [
  "@eslint/js",
  "@k13engineering/releasetool",
  "@types/node",
  "c8",
  "deno-node",
  "typescript-eslint",
];

devDependenciesToAdd.forEach((depName) => {
  const depVersion = findDependencyVersion({ dependencyName: depName });
  packageJson = {
    ...packageJson,
    devDependencies: {
      ...packageJson.devDependencies,
      [depName]: depVersion,
    }
  };
});

const formatJsonWithTrailingNewline = ({ data }: { data: unknown }) => {
  return `${JSON.stringify(data, null, 2)}\n`;
};

const targetPackageJsonPath = nodePath.join(packageFolder, "package.json");
if (nodeFs.existsSync(targetPackageJsonPath)) {
  throw Error(`package.json already exists in ${packageFolder}`);
}
nodeFs.writeFileSync(targetPackageJsonPath, formatJsonWithTrailingNewline({ data: packageJson }), { encoding: "utf-8" });

const packageJsonNpm = {
  name: answers.packageName,
  type: "module",
  description: answers.description,
  publishConfig: {
    "access": "public"
  },
  files: [
    "dist"
  ],
  main: "dist/lib/index.js",
  repository: {
    "type": "git",
    "url": `git+${answers.repositoryUrl}`
  },
  keywords: [

  ],
  author: answers.authorName,
  license: answers.license,
  bugs: {
    "url": answers.bugsUrl
  },
  homepage: answers.homepageUrl,
};

const targetPackageJsonNpmPath = nodePath.join(packageFolder, "package.npm.json");
if (nodeFs.existsSync(targetPackageJsonNpmPath)) {
  throw Error(`package.json.npm already exists in ${packageFolder}`);
}
nodeFs.writeFileSync(targetPackageJsonNpmPath, formatJsonWithTrailingNewline({ data: packageJsonNpm }), { encoding: "utf-8" });

const simpleFilesToCopy = [
  ".editorconfig",
  "eslint.config.js",
  "tsconfig.json",
];

simpleFilesToCopy.forEach((fileName) => {
  const sourceFilePath = nodePath.join(boilerplatePackageFolder, fileName);
  const targetFilePath = nodePath.join(packageFolder, fileName);

  if (nodeFs.existsSync(targetFilePath)) {
    throw Error(`${fileName} already exists in ${packageFolder}`);
  }

  console.log(`Copying ${fileName} to ${packageFolder}`);

  nodeFs.copyFileSync(sourceFilePath, targetFilePath);
});

const targetLibFolder = nodePath.join(packageFolder, "lib");
nodeFs.mkdirSync(targetLibFolder, { recursive: true });

const targetLibIndexPath = nodePath.join(targetLibFolder, "index.ts");
if (nodeFs.existsSync(targetLibIndexPath)) {
  throw Error(`lib/index.ts already exists in ${packageFolder}`);
}
nodeFs.writeFileSync(targetLibIndexPath, `\n`, { encoding: "utf-8" });

const targetTestFolder = nodePath.join(packageFolder, "test");
nodeFs.mkdirSync(targetTestFolder, { recursive: true });

const targetTestIndexPath = nodePath.join(targetTestFolder, "index.ts");
if (nodeFs.existsSync(targetTestIndexPath)) {
  throw Error(`test/index.ts already exists in ${packageFolder}`);
}
nodeFs.writeFileSync(targetTestIndexPath, ``);

console.log(`Initialized package in folder ${packageFolder}`);
