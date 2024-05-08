import fs from "fs";
import * as tsj from "ts-json-schema-generator";

const config = {
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    type: "*",
    extraTags: ["errorMessage"]
};

const schemaGenerator = tsj.createGenerator(config);

const requestTypes = schemaGenerator
    .getRootNodes()
    .map((x) => x.symbol.escapedName)
    .filter((x) => x.endsWith("Request"));

const schemaDeclarations = requestTypes
    .map((type) => {
        try {
            const schema = schemaGenerator.createSchema(type);
            return `export const ${type}: any = ${JSON.stringify(schema, undefined, 4)}`;
        } catch (e) {
            if (!(e instanceof tsj.NoRootTypeError)) throw e;
        }
    })
    .filter((s) => s)
    .join("\n\n");

const outputPath = new URL("../src/useCases/common/Schemas.ts", import.meta.url).pathname;
fs.writeFile(outputPath, schemaDeclarations, (err) => {
    if (err) throw err;
});
