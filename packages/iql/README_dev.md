# Development

To bootstrap the project clone the repository and run `npm i`. Afterwards the following commands are available:

-   `npm run demo`: Serves a demo application at _localhost:4000_ using _demo/attributes.js_ as dummy data. App recompiles and reloads if the data, the app code or the grammar is changed.
-   `npm run build`: Runs full compilation pipeline.
-   `npm run test`: Runs tests.
-   `npm run lint`: Runs linters.

The `demo/` directory contains the live demo's files, `src/grammar.peggy` is the definition file for the IQL grammar. The remainder are either self-explanatory or customary files and directories.
