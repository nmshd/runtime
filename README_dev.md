## Setup

1. Download and install [Node JS](https://nodejs.org/en/download/)
2. run `npm i`
3. run `npm run build:watch` (this is also added as a VSCode task that is configured to [run on folder open](https://code.visualstudio.com/updates/v1_30#_run-on-folder-open))

## Running scripts

This workspace provides two types of scripts:

- root level scripts (like lints):

    These can be run by `npm run <scriptname>` from the root of the project.

- package level scripts (like tests):

    These can be run by `npm run <scriptname>` from the package directory or by `npm run -w packages/<package> <scriptname>` from the root of the project.

    Additionally, you can run a script in all workspaces by `npm run --workspaces --if-present <scriptname>`.

## Linting

- TypeScript:
    - Each package provides its own TypeScript linting script. You can run it by `npm run lint:tsc` from the package directory or by `npm run -w packages/<package> lint:tsc` from the root of the project.
    - The root project also provides a script that lints all packages. You can run it by `npm run lint:tsc` from the root of the project.
- Prettier: Run `npm run lint:prettier` from the root of the project.
- ESLint: Run `npm run lint:eslint` from the root of the project.

## Check for outdated dependencies

To check for outdated dependencies, run `npm run outdated`. This will check the root folder and all packages using [npm-check-updates](https://www.npmjs.com/package/npm-check-updates).

## How to test

### Remote Backbone

Set the following environment variables:

- `NMSHD_TEST_BASEURL` (the Backbone baseUrl to test against)
- `NMSHD_TEST_CLIENTID` (the Backbone clientId for the configured baseUrl)
- `NMSHD_TEST_CLIENTSECRET` (the Backbone clientSecret for the configured baseUrl)
- `NMSHD_TEST_BASEURL_ADMIN_API` (the Backbone admin API baseUrl to test against)
- `NMSHD_TEST_ADMIN_API_KEY` (the Backbone admin API key for the configured baseUrl)

> We recommend to persist these variables for example in your `.bashrc` / `.zshrc` or in the Windows environment variables.

### Local Backbone

To start a local Backbone, execute the following command:

```shell
npm run start:backbone
```

Set the following environment variables:

- `NMSHD_TEST_BASEURL` to `http://localhost:8090`
- `NMSHD_TEST_CLIENTID` to `test`
- `NMSHD_TEST_CLIENTSECRET` to `test`
- `NMSHD_TEST_BASEURL_ADMIN_API` to `http://localhost:8091`
- `NMSHD_TEST_ADMIN_API_KEY` to `test`

> We recommend to persist these variables for example in your `.bashrc` / `.zshrc` or in the Windows environment variables.

### Running the tests

- a specific database: `npm run test:local:[mongodb|lokijs|ferretdb]`
- a specific test suite: `npm run test:local:[mongodb|lokijs|ferretdb] -- testSuiteName`
- with code coverage: `npm run test:local:[mongodb|lokijs|ferretdb] -- --coverage`, a result summary is written to the console, a detailed report is accessible via the path `coverage/lcov-report/index.html`

### Teardown

After testing on MongoDB or FerretDB, you can run `npm run test:local:teardown` to remove the test database.

## Error Solving Guide

### Build / Tests resolve into strange errors

Examples:

- Doesn't build at all
- Module not found
- Something is undefined which should not be undefined (e.g. "TypeError: Cannot read property 'from_base64' of undefined")

Solutions:

- Check if you have got absolute `"src/"` or `"/"` includes somewhere and change them to relative ones (`"../"`).
- Check if you have a cyclic reference somewhere (sometimes quite hard to find). In general, no class should include something from the root's `index.ts` export (looks like `import * from "../../"`).
- Check if you have `"/dist"` as suffix for includes (e.g. `"@nmshd/crypto/dist"`). This usually works fine within NodeJS, however Webpack (Browser Build) has some issues therein, resulting e.g. in the crypto lib being copied into the transport lib. It should be fixed, but you never know...

### Something about duplicating private properties

Do not use abstract classes.

### Serialization/Deserialization doesn't work

Or deserialize-/fromUnknown doesn't find your class.

- Check if all (parent) classes up to Serializable(-Async) inclulde a `@schema` declaration with a type.
- You might have several different Serializable(-Async) instances up- and running. This usually happens if ts-serval/crypto/transport are not correctly imported.
