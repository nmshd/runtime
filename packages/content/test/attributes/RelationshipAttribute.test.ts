import { ProprietaryURL, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";

describe("RelationshipAttribute", function () {
    const attributeValue = ProprietaryURL.from({
        title: "Title",
        value: "http://my.url"
    });

    const attributeSerialized = {
        "@type": "ProprietaryURL",
        title: "Title",
        value: "http://my.url"
    };

    function expectValidRelationshipAttribute(value: RelationshipAttribute<ProprietaryURL>): void {
        expect(value).toBeInstanceOf(RelationshipAttribute);
        expect(value.value.toJSON()).toStrictEqual(attributeSerialized);
        expect(value.value).toBeInstanceOf(ProprietaryURL);
    }

    test("should create a RelationshipAttribute (isTechnical: true)", function () {
        const attribute = RelationshipAttribute.from<ProprietaryURL>({
            key: "aKey",
            value: attributeValue,
            owner: CoreAddress.from("address"),
            isTechnical: true,
            confidentiality: RelationshipAttributeConfidentiality.Public
        });

        expectValidRelationshipAttribute(attribute);
    });

    test("should create a RelationshipAttribute (isTechnical: false)", function () {
        const attribute = RelationshipAttribute.from<ProprietaryURL>({
            key: "aKey",
            value: attributeValue,
            owner: CoreAddress.from("address"),
            isTechnical: false,
            confidentiality: RelationshipAttributeConfidentiality.Public
        });

        expectValidRelationshipAttribute(attribute);
    });

    test("should create a RelationshipAttribute (isTechnical: undefined)", function () {
        const attribute = RelationshipAttribute.from<ProprietaryURL>({
            key: "aKey",
            value: attributeValue,
            owner: CoreAddress.from("address"),
            confidentiality: RelationshipAttributeConfidentiality.Public
        });

        expectValidRelationshipAttribute(attribute);
    });
});
