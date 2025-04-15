import * as content from "@nmshd/content";
import fs from "fs";
import * as tsj from "ts-json-schema-generator";

const runtimeConfig = {
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    type: "*",
    extraTags: ["errorMessage"]
};

const schemaDeclarations = getSchemaDeclarations(runtimeConfig, (x) => x.endsWith("Request"));

const contentConfig = {
    ...runtimeConfig,
    tsconfig: new URL("../../content/tsconfig.json", import.meta.url).pathname
};
const attributeValues = content.AttributeValues.Identity.TYPE_NAMES.map((x) => `${x}JSON`);
const attributeSchemaDeclarations = getSchemaDeclarations(contentConfig, (x) => attributeValues.includes(x));
const cleanAttributeSchemaDeclarations = attributeSchemaDeclarations.replaceAll("JSON", "");

const outputPath = new URL("../src/useCases/common/Schemas.ts", import.meta.url).pathname;
fs.writeFile(outputPath, `${schemaDeclarations}\n\n${cleanAttributeSchemaDeclarations}`, (err) => {
    if (err) throw err;
});

function getSchemaDeclarations(tsconfig, filter) {
    const schemaGenerator = tsj.createGenerator(tsconfig);

    const types = schemaGenerator
        .getRootNodes()
        .map((x) => x.symbol.escapedName)
        .filter(filter);

    const schemaValidatables = types.filter((x) => x.startsWith("SchemaValidatable")).map((x) => x.replace("SchemaValidatable", ""));
    const typesToGenerate = types.filter((x) => !schemaValidatables.includes(x));

    return typesToGenerate
        .map((type) => {
            try {
                const schema = schemaGenerator.createSchema(type);
                return `export const ${type}: any = ${JSON.stringify(schema, undefined, 4)}`.replaceAll("SchemaValidatable", "");
            } catch (e) {
                if (!(e instanceof tsj.NoRootTypeError)) throw e;
            }
        })
        .filter((s) => s)
        .join("\n\n");
}
