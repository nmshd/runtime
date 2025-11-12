import { RelationshipAttributeConfidentiality, RelationshipAttributeCreationHints, RelationshipAttributeCreationHintsJSON, ValueHints } from "@nmshd/content";

describe("RelationshipAttributeHints", function () {
    test("create from interface", function () {
        const creationHints = RelationshipAttributeCreationHints.from({
            valueType: "ProprietaryString",
            confidentiality: RelationshipAttributeConfidentiality.Public,
            title: "A Title",
            description: "A Subject",
            valueHints: ValueHints.from({})
        });
        expect(creationHints).toBeInstanceOf(RelationshipAttributeCreationHints);
    });

    test("create from JSON", function () {
        const creationHintsJSON: RelationshipAttributeCreationHintsJSON = {
            valueType: "ProprietaryString",
            confidentiality: RelationshipAttributeConfidentiality.Public,
            title: "A Title",
            description: "A Subject",
            valueHints: { "@type": "ValueHints" }
        };
        const creationHints = RelationshipAttributeCreationHints.from(creationHintsJSON);
        expect(creationHints).toBeInstanceOf(RelationshipAttributeCreationHints);
    });

    test.each(["", "non-existing-value-type"])("should validate valueType ('%s' should be invalid)", function (invalidValueType) {
        expect(() =>
            RelationshipAttributeCreationHints.from({
                // @ts-expect-error
                valueType: invalidValueType,
                confidentiality: RelationshipAttributeConfidentiality.Public,
                title: "A Title"
            })
        ).toThrow("RelationshipAttributeCreationHints.valueType:String :: must be one of:");
    });
});
