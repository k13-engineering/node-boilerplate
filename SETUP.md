# Aligning a project with node-boilerplate

These instructions are for an agent bringing a Node.js/TypeScript package (the
"target repo") in line with this boilerplate. Work through both parts. The
project is done when the checker reports nothing and all CI steps pass.

## 1. Run the checker

`bin/check.ts` compares a target repo against this boilerplate and lists
everything that is missing or incorrect.

Install the boilerplate's dependencies once, then pass the target repo as the
only argument:

```sh
cd <path-to-node-boilerplate>
npm install
node bin/check.ts <path-to-target-repo>
```

This needs Node 24 or newer, which runs `.ts` files directly.

Each problem is printed to stderr as a JSON object:

```json
{
  "problem": "tsconfig.json does not match the boilerplate. Expected ... but found ...",
  "solution": "Update tsconfig.json in the checked package so its contents match the boilerplate version from this repository."
}
```

How to use the output:

- **Empty output means the target repo passes.** Don't rely on the exit code:
  the checker also exits with 0 when it has reported problems.
- **Fix the problems, then run the checker again until it prints nothing.** If
  `package.json` or `package.npm.json` is missing or is not valid JSON, the
  checker stops at that point. Later problems only show up after you fix it.
- **Treat `bin/check.ts` as the source of truth.** If this file and the checker
  disagree, follow the checker.

What it checks:

- **Files that must be identical to the boilerplate:** `.editorconfig`,
  `tsconfig.json`, `eslint.config.js`, `.github/workflows/ci.yml` and
  `.github/workflows/npm-publish.yml`. Copy these from this repository without
  changes. If the target code then fails to lint or type-check, fix the code,
  not these files.
- **`package.json`:**
  - The toolchain devDependencies must have the same versions as the
    boilerplate.
  - `c8` and `npm-check-updates` are optional, but if present, their versions
    must also match.
  - Some packages are not allowed, for example `typescript-eslint`.
  - The scripts `test`, `build`, `lint`, `type-check` and `update-deps` are
    required.
  - Package metadata (`name`, `author`, `description`, `repository`, `bugs`,
    `homepage`, `license`) must not be in this file.
- **`package.npm.json`:** this file holds the package metadata listed above,
  plus `main`. Its `files` and `publishConfig` must match the boilerplate. At
  publish time, the release workflow merges it into `package.json`.

## 2. Unit tests: mocha and c8

Projects use [mocha](https://mochajs.org/) for unit tests and
[c8](https://github.com/bcoe/c8) for coverage.

This boilerplate uses the same setup, so you can use its `package.json` and
`lib/index.spec.ts` as a reference.

### Dependencies

```sh
npm install --save-dev mocha @types/mocha
```

Also add `c8` as a devDependency, at the same version as in this boilerplate's
`package.json`. The checker enforces that version.

### Where tests go

By default, put each test file next to the file it tests, as
`lib/**/*.spec.ts`:

```
lib/util.ts
lib/util.spec.ts
lib/parser/tokenize.ts
lib/parser/tokenize.spec.ts
```

Coverage does not include spec files. It covers only the real sources in
`lib/`.

### The `test` script

```json
"test": "c8 --100 --reporter lcov --reporter html --reporter text --all --src lib/ --exclude 'lib/**/*.spec.ts' mocha 'lib/**/*.spec.ts'"
```

- `--100` makes the script fail unless lines, branches, functions and
  statements are all covered to 100%.
- `mocha 'lib/**/*.spec.ts'` runs every spec file. Keep the quotes so that
  mocha expands the glob, not the shell.
- `--exclude 'lib/**/*.spec.ts'` keeps spec files out of the coverage report.
  This flag replaces c8's default exclude list, so add another `--exclude` for
  any other non-source code in `lib/`, such as fixtures or generated files.
- `--all --src lib/` also reports files that no test imports. Untested files
  show up with 0% coverage instead of being missing from the report.
- Add `coverage` to `.gitignore`.
- If a project keeps tests somewhere else, change the mocha glob and the c8
  `--exclude` together so they match.

### Writing spec files

Import `describe`, `it` and any hooks from `mocha` explicitly.
`tsconfig.json` only loads Node types (`"types": ["node"]`), and the checker
requires that file to stay unchanged. Mocha's global functions therefore fail
`npm run type-check` unless you import them. Use `node:assert` for assertions.

```ts
import assert from "node:assert";
import { describe, it } from "mocha";
import { add } from "./math.ts";

describe("math", () => {
  describe("add", () => {
    it("should add two numbers", () => {
      assert.strictEqual(add({ a: 1, b: 2 }), 3);
    });
  });
});
```

- Node runs the TypeScript directly. You don't need `tsx`, `ts-node` or a
  mocha loader.
- In relative imports, use the `.ts` extension.
- `npm run lint` and `npm run type-check` also check spec files, so they must
  pass both.
- The build starts at `lib/index.ts` and only follows its imports, so spec
  files are not published in `dist/`.

## Done when

1. `node bin/check.ts <path-to-target-repo>` prints nothing.
2. These all succeed in the target repo, in the order CI runs them:

   ```sh
   npm ci
   npm run build
   npm run type-check
   npm run test
   npm run lint
   ```
