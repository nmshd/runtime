import fs from "fs";
import * as tsj from "ts-json-schema-generator";

const config = {
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    type: "*",
    extraTags: ["errorMessage"]
};

const schemaGenerator = tsj.createGenerator(config);

const customConfig = {
    ...config,
    tsconfig: new URL("./tsconfig.json", import.meta.url).pathname
};

const customGenerator = tsj.createGenerator(customConfig);
const customTypes = getRequestTypes(customGenerator);
const customSchemaDeclarations = getSchemaDeclarations(customGenerator, customTypes);

const requestTypes = getRequestTypes(schemaGenerator).filter((x) => !customTypes.includes(x));

const schemaDeclarations = getSchemaDeclarations(schemaGenerator, requestTypes);

const outputPath = new URL("../src/useCases/common/Schemas.ts", import.meta.url).pathname;
fs.writeFile(outputPath, schemaDeclarations + "\n\n" + customSchemaDeclarations, (err) => {
    if (err) throw err;
});

function getRequestTypes(schemaGenerator) {
    return schemaGenerator
        .getRootNodes()
        .map((x) => x.symbol.escapedName)
        .filter((x) => x.endsWith("Request"));
}

function getSchemaDeclarations(schemaGenerator, requestTypes) {
    return requestTypes
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
}
