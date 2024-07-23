import { ValidationError } from "@js-soft/ts-serval";
import { TestObjectFactory } from "@nmshd/consumption/test/modules/requests/testHelpers/TestObjectFactory";
import { IdentityAttributeQuery, IQLQuery, ProposeAttributeRequestItem, RelationshipAttributeConfidentiality, RelationshipAttributeQuery } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";

describe("creation of ProposeAttributeRequestItem", () => {
    describe("creation of ProposeAttributeRequestItem with IdentityAttributeQuery", () => {
        test("can create a ProposeAttributeRequestItem with IdentityAttributeQuery", function () {
            const validProposeAttributeRequestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });

            expect(validProposeAttributeRequestItem.constructor.name).toBe("ProposeAttributeRequestItem");
            expect(validProposeAttributeRequestItem.attribute.constructor.name).toBe("IdentityAttribute");
            expect(validProposeAttributeRequestItem.attribute.value.constructor.name).toBe("GivenName");
            expect(validProposeAttributeRequestItem.query.constructor.name).toBe("IdentityAttributeQuery");
        });

        test("returns an error when trying to create an invalid ProposeAttributeRequestItem with IdentityAttributeQuery and RelationshipAttribute", function () {
            const invalidProposeAttributeRequestItemCall = () => {
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    attribute: TestObjectFactory.createRelationshipAttribute({
                        owner: CoreAddress.from("")
                    }),
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                });
            };
            expect(invalidProposeAttributeRequestItemCall).toThrow(
                new ValidationError(ProposeAttributeRequestItem.name, "", "When proposing a RelationshipAttribute, the corresponding query has to be a RelationshipAttributeQuery.")
            );
        });

        test("returns an error when trying to create an invalid ProposeAttributeRequestItem with mismatching IdentityAttribute value type", function () {
            const invalidProposeAttributeRequestItemCall = () => {
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    attribute: TestObjectFactory.createIdentityAttribute({
                        owner: CoreAddress.from("")
                    }),
                    query: IdentityAttributeQuery.from({ valueType: "DisplayName" })
                });
            };
            expect(invalidProposeAttributeRequestItemCall).toThrow(
                new ValidationError(
                    ProposeAttributeRequestItem.name,
                    `${nameof<ProposeAttributeRequestItem>((x) => x.query)}.${nameof<IdentityAttributeQuery>((x) => x.valueType)}`,
                    "You cannot propose an Attribute whose type of the value ('GivenName') is different from the value type of the query ('DisplayName')."
                )
            );
        });
    });

    describe("creation of ProposeAttributeRequestItem with IQLQuery", () => {
        test("returns an error when trying to create an invalid ProposeAttributeRequestItem with IQLQuery and mismatching IdentityAttribute value type", function () {
            const invalidProposeAttributeRequestItemCall = () => {
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    attribute: TestObjectFactory.createIdentityAttribute({
                        owner: CoreAddress.from("")
                    }),
                    query: IQLQuery.from({ queryString: "DisplayName", attributeCreationHints: { valueType: "DisplayName" } })
                });
            };
            expect(invalidProposeAttributeRequestItemCall).toThrow(
                new ValidationError(
                    ProposeAttributeRequestItem.name,
                    `${nameof<ProposeAttributeRequestItem>((x) => x.query)}.${nameof<IQLQuery>((x) => x.attributeCreationHints!.valueType)}`,
                    "You cannot propose an Attribute whose type of the value ('GivenName') is different from the value type of the query ('DisplayName')."
                )
            );
        });
    });

    describe("creation of ProposeAttributeRequestItem with RelationshipAttributeQuery", () => {
        test("can create a ProposeAttributeRequestItem with RelationshipAttributeQuery", function () {
            const validProposeAttributeRequestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    owner: CoreAddress.from("")
                }),
                query: RelationshipAttributeQuery.from({
                    owner: "",
                    key: "AKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            expect(validProposeAttributeRequestItem.constructor.name).toBe("ProposeAttributeRequestItem");
            expect(validProposeAttributeRequestItem.attribute.constructor.name).toBe("RelationshipAttribute");
            expect(validProposeAttributeRequestItem.attribute.value.constructor.name).toBe("ProprietaryString");
            expect(validProposeAttributeRequestItem.query.constructor.name).toBe("RelationshipAttributeQuery");
        });

        test("returns an error when trying to create an invalid ProposeAttributeRequestItem with RelationshipAttributeQuery and IdentityAttribute", function () {
            const invalidProposeAttributeRequestItemCall = () => {
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    attribute: TestObjectFactory.createIdentityAttribute({
                        owner: CoreAddress.from("")
                    }),
                    query: RelationshipAttributeQuery.from({
                        owner: "",
                        key: "AKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "ATitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    })
                });
            };
            expect(invalidProposeAttributeRequestItemCall).toThrow(
                new ValidationError(
                    ProposeAttributeRequestItem.name,
                    "",
                    "When proposing an IdentityAttribute, the corresponding query has to be a IdentityAttributeQuery or IQLQuery."
                )
            );
        });

        test("returns an error when trying to create an invalid ProposeAttributeRequestItem with mismatching RelationshipAttribute value type", function () {
            const invalidProposeAttributeRequestItemCall = () => {
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    attribute: TestObjectFactory.createRelationshipAttribute({
                        owner: CoreAddress.from("")
                    }),
                    query: RelationshipAttributeQuery.from({
                        owner: "",
                        key: "AKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryInteger",
                            title: "ATitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    })
                });
            };
            expect(invalidProposeAttributeRequestItemCall).toThrow(
                new ValidationError(
                    ProposeAttributeRequestItem.name,
                    `${nameof<ProposeAttributeRequestItem>((x) => x.query)}.${nameof<RelationshipAttributeQuery>((x) => x.attributeCreationHints.valueType)}`,
                    "You cannot propose an Attribute whose type of the value ('ProprietaryString') is different from the value type of the query ('ProprietaryInteger')."
                )
            );
        });
    });
});
