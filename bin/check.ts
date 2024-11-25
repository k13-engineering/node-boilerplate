import fs from "node:fs";
import nodePath from "node:path";
// @ts-expect-error missing types
import { loadAsUtf8String } from "esm-resource";
import deepEqual from "deep-equal";

// const folderToCheck = "/home/simon/projects/wurzel";
const folderToCheck = "/home/simon/projects/node-robust-streams";

const filesToCheck = [
  ".editorconfig",
  "tsconfig.json",
  "eslint.config.js",
  ".github/workflows/ci.yml",
];

let ourFileContents: { [key: string]: string } = {};

const loadOurFileAsUtf8String = async ({ filename }: { filename: string }) => {
  return await loadAsUtf8String({ importMeta: import.meta, filepath: nodePath.join("..", filename) });
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
  "ya-test-library",
  "tsx",
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

const requiredPackageJsonFields = [
  "name",
  "version",
  "author",
  "description",
  "main",
  "devDependencies",
  "dependencies",
  "repository",
  "author",
  "bugs",
  "homepage",
  "license",
];

requiredPackageJsonFields.forEach((field) => {
  if (theirPackageJson[field] === undefined) {
    console.log(`missing field in package.json '${field}'`);
  }
});

const requiredScripts = [
  "test",
  "build",
  "lint",
];

requiredScripts.forEach((script) => {
  if (theirPackageJson.scripts[script] === undefined) {
    console.log(`missing script in package.json '${script}'`);
  }
});
