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
            const schema = reverseJsonSchemaProperties(schemaGenerator.createSchema(type));
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

/**
 * Reverses the order of properties in the definitions of a JSON Schema (v7), including nested properties.
 * @param {object} schema - The JSON Schema object.
 * @returns {object} - A new JSON Schema object with reversed properties in definitions.
 */
function reverseJsonSchemaProperties(schema) {
    if (!schema || typeof schema !== "object") {
        throw new Error("Invalid schema: must be an object.");
    }

    // Recursive function to reverse properties
    function reverseProperties(obj) {
        if (!obj || typeof obj !== "object") return obj;

        if (obj.properties && typeof obj.properties === "object") {
            const reversedProperties = {};
            const propertyKeys = Object.keys(obj.properties);

            // Reverse the order of property keys
            propertyKeys.reverse().forEach((key) => {
                reversedProperties[key] = reverseProperties(obj.properties[key]);
            });

            return {
                ...obj,
                properties: reversedProperties
            };
        }

        return obj;
    }

    // Ensure the schema has a definitions field to process
    if (!schema.definitions || typeof schema.definitions !== "object") {
        return { ...schema }; // Return a shallow copy if no definitions to process
    }

    const reversedDefinitions = {};

    // Iterate over each definition and reverse its properties recursively
    Object.keys(schema.definitions).forEach((definitionKey) => {
        reversedDefinitions[definitionKey] = reverseProperties(schema.definitions[definitionKey]);
    });

    // Return a new schema object with reversed definitions
    return {
        ...schema,
        definitions: reversedDefinitions
    };
}
