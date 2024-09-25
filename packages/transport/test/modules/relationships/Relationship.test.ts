import { CoreId } from "@nmshd/core-types";
import { SodiumWrapper } from "@nmshd/crypto";
import { Relationship } from "../../../src";

describe("Relationship", function () {
    beforeAll(async () => {
        await SodiumWrapper.ready();
    });

    test("should deserialize a relationship", function () {
        const relationship = Relationship.fromAny({
            id: "anId",
            relationshipSecretId: "aRelationshipSecretId",
            peer: {
                address: "anAddress",
                publicKey: { alg: 1, pub: "affeaffeaffeaffeaffeaffeaffeaffe" }
            },
            status: "aStatus",
            cache: { creationContent: {}, auditLog: [] },
            templateId: "aTemplateId"
        });

        expect(relationship.templateId).toBeInstanceOf(CoreId);
        expect(relationship.templateId.toString()).toBe("aTemplateId");
    });

    test("should deserialize an old relationship containing cache.template", function () {
        const relationship = Relationship.fromAny({
            id: "anId",
            relationshipSecretId: "aRelationshipSecretId",
            peer: {
                address: "anAddress",
                publicKey: { alg: 1, pub: "affeaffeaffeaffeaffeaffeaffeaffe" }
            },
            status: "aStatus",
            cache: { template: { id: "aTemplateId" }, creationContent: {}, auditLog: [] }
        });

        expect(relationship.templateId).toBeInstanceOf(CoreId);
        expect(relationship.templateId.toString()).toBe("aTemplateId");
    });

    test("should throw an error if neither cache.template.id or templateId are set", function () {
        expect(() =>
            Relationship.fromAny({
                id: "anId",
                relationshipSecretId: "aRelationshipSecretId",
                peer: {
                    address: "anAddress",
                    publicKey: {
                        alg: 1,
                        pub: "affeaffeaffeaffeaffeaffeaffeaffe"
                    }
                },
                status: "aStatus",
                cache: {
                    creationContent: {},
                    auditLog: []
                }
            })
        ).toThrow("Relationship.templateId :: Value is not defined");
    });
});
