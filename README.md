# node-boilerplate
Boilerplate for Node.js projects

## Setup

```
npm install
```

## Running tests

This boilerplate project uses [Mocha](https://github.com/mochajs/mocha) as test framework and [c8](https://github.com/bcoe/c8) for code coverage.

To run tests including code coverage analysis, use:

```
npm run test
```

## Running ESLint

ESLint comes configured for `"ecmaVersion": 8` and `"sourceType": "module"` using `eslint:recommended` rules preset. 

```
npm run lint
```

## Releasing

Pushing a tag such as `v1.2.3` runs `.github/workflows/npm-publish.yml`. It
builds the package, merges `package.npm.json` into `package.json`, sets the
version from the tag and stages the release with `npm stage publish`.

A staged release is not installable until a maintainer approves it, which
requires two-factor authentication:

```
npm stage list @k13engineering/<package>
npm stage approve <stage-id>
```

Use `npm stage reject <stage-id>` to discard a staged release.
