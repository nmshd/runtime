import * as content from "@nmshd/content";
import fs from "fs";
import * as tsj from "ts-json-schema-generator";

const runtimeConfig = {
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    type: "*",
    extraTags: ["errorMessage"]
};

const runtimeSchemaGenerator = tsj.createGenerator(runtimeConfig);

const contentConfig = {
    ...runtimeConfig,
    tsconfig: new URL("../../content/tsconfig.json", import.meta.url).pathname
};

const attributeValues = content.AttributeValues.TYPE_NAMES.map((x) => x + "JSON");

const contentGenerator = tsj.createGenerator(contentConfig);
const contentTypes = getRequestTypes(contentGenerator).filter((x) => attributeValues.includes(x));
const contentSchemaDeclarations = getSchemaDeclarations(contentGenerator, contentTypes);

const requestTypes = getRequestTypes(runtimeSchemaGenerator).filter((x) => x.endsWith("Request"));
const runtimeSchemaDeclarations = getSchemaDeclarations(runtimeSchemaGenerator, requestTypes);

const outputPath = new URL("../src/useCases/common/Schemas.ts", import.meta.url).pathname;
fs.writeFile(outputPath, runtimeSchemaDeclarations + "\n\n" + contentSchemaDeclarations, (err) => {
    if (err) throw err;
});

function getRequestTypes(schemaGenerator) {
    return schemaGenerator.getRootNodes().map((x) => x.symbol.escapedName);
}

function getSchemaDeclarations(schemaGenerator, requestTypes) {
    return requestTypes
        .map((type) => {
            try {
                const schema = schemaGenerator.createSchema(type);
                return `export const ${type}: any = ${JSON.stringify(schema, undefined, 4)}`;
            } catch (e) {
                throw e;
            }
        })
        .filter((s) => s)
        .join("\n\n");
}
