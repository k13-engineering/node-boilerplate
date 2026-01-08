import fs from "node:fs";
import nodePath from "node:path";
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

const loadOurFileAsUtf8String = async ({ filename }: { filename: string }) => {
  const ourFileAsBlob = await loadAsBlob({ importMeta: import.meta, filepath: nodePath.join("..", filename) });
  return await ourFileAsBlob.text();
};

for (const filename of filesToCheck) {

  const content = await loadOurFileAsUtf8String({ filename });

  ourFileContents = {
    ...ourFileContents,
    [filename]: content,
  };
}

const ourPackageJsonAsString = await loadOurFileAsUtf8String({ filename: "package.json" });
const ourPackageJson = JSON.parse(ourPackageJsonAsString);

// const ourPackageJsonNpmAsString = await loadOurFileAsUtf8String({ filename: "package.json.npm" });
// const ourPackageJsonNpm = JSON.parse(ourPackageJsonNpmAsString);

for (const filename of filesToCheck) {
  const fullPath = nodePath.resolve(folderToCheck, filename);

  let content: string;

  try {
    content = await fs.promises.readFile(fullPath, "utf-8");
  } catch (ex: unknown) {

    if (typeof ex === "object" && ex !== null && "code" in ex && (ex as { code: unknown }).code === "ENOENT") {
      console.log(`${filename} does not exist`);
      continue;
    }

    throw ex;
  }

  const ourContent = ourFileContents[filename];

  if (content.trim() !== ourContent.trim()) {
    console.log(`${filename} is different`);
  }
}

const theirPackageJsonAsString = await fs.promises.readFile(nodePath.resolve(folderToCheck, "package.json"), "utf-8");
const theirPackageJson = JSON.parse(theirPackageJsonAsString);

const theirPackageJsonNpmAsString = await fs.promises.readFile(nodePath.resolve(folderToCheck, "package.json.npm"), "utf-8");
const theirPackageJsonNpm = JSON.parse(theirPackageJsonNpmAsString);

const checkDevDependency = ({ dependencyName }: { dependencyName: string }) => {

  return {
    theirs: theirPackageJson?.devDependencies?.[dependencyName],
    ours: ourPackageJson.devDependencies[dependencyName],
  };
};

const devDependenciesToCheck = [
  "c8",
  "deno-node",
  "@eslint/js",
  "typescript-eslint",
  "@types/node",
];

for (const dependencyName of devDependenciesToCheck) {
  const { theirs, ours } = checkDevDependency({ dependencyName });

  if (theirs !== ours) {
    console.log(`${dependencyName} is different (${theirs === undefined ? "<missing>" : theirs} vs ${ours})`);
  }
}

const checkDependency = ({ dependencyName }: { dependencyName: string }) => {
  return {
    theirs: theirPackageJson?.dependencies?.[dependencyName],
    ours: ourPackageJson.dependencies[dependencyName],
  };
};

const dependenciesToCheck: string[] = [

];

for (const dependencyName of dependenciesToCheck) {
  const { theirs, ours } = checkDependency({ dependencyName });

  if (theirs !== ours) {
    console.log(`${dependencyName} is different (${theirs === undefined ? "<missing>" : theirs} vs ${ours})`);
  }
}


if (!deepEqual(theirPackageJson?.files, ourPackageJson.files)) {
  console.log(`files differ (${JSON.stringify(theirPackageJson?.files)} vs ${JSON.stringify(ourPackageJson.files)})`);
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
    console.log(`missing field in package.json '${field}'`);
  }
});

const requiredScripts = [
  "test",
  "build",
  "lint",
];

if (theirPackageJson.scripts === undefined) {
  console.log(`missing scripts in package.json`);
} else {
  requiredScripts.forEach((script) => {
    if (theirPackageJson.scripts[script] === undefined) {
      console.log(`missing script in package.json '${script}'`);
    }
  });
}
