import * as content from "@nmshd/content";
import fs from "fs";
import * as tsj from "ts-json-schema-generator";

const runtimeConfig = {
    tsconfig: new URL("../tsconfig.ajv.json", import.meta.url).pathname,
    type: "*",
    extraTags: ["errorMessage"]
};
const runtimeSchemaDeclarations = getSchemaDeclarations(runtimeConfig, (x) => x.endsWith("Request"));

const contentConfig = {
    ...runtimeConfig,
    tsconfig: new URL("../../content/tsconfig.json", import.meta.url).pathname
};
const attributeValues = content.AttributeValues.Identity.TYPE_NAMES.map((x) => `${x}JSON`);
const contentSchemaDeclarations = getSchemaDeclarations(contentConfig, (x) => attributeValues.includes(x));

const outputPath = new URL("../src/useCases/common/Schemas.ts", import.meta.url).pathname;
fs.writeFile(outputPath, `${runtimeSchemaDeclarations}\n\n${contentSchemaDeclarations}`, (err) => {
    if (err) throw err;
});

function getSchemaDeclarations(tsconfig, filter) {
    const schemaGenerator = tsj.createGenerator(tsconfig);
    const types = schemaGenerator
        .getRootNodes()
        .map((x) => x.symbol.escapedName)
        .filter(filter);
    return types
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
