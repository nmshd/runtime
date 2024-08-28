import {
    GivenName,
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RelationshipCreationContent,
    RelationshipTemplateContent,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { GeneratableCoreId } from "@nmshd/transport";
import { DataViewExpander, TransportServices } from "../../src";
import { establishRelationshipWithContents, RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportServices2: TransportServices;
let expander1: DataViewExpander;
let expander2: DataViewExpander;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    transportServices1 = runtimeServices[0].transport;
    transportServices2 = runtimeServices[1].transport;
    expander1 = runtimeServices[0].expander;
    expander2 = runtimeServices[1].expander;
    await establishRelationshipWithContents(
        transportServices1,
        transportServices2,

        RelationshipTemplateContent.from({
            onNewRelationship: {
                "@type": "Request",
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: {
                            "@type": "IdentityAttributeQuery",
                            valueType: "CommunicationLanguage"
                        }
                    })
                ]
            }
        }).toJSON(),
        RelationshipCreationContent.from({
            response: {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: (await GeneratableCoreId.generate()).toString(),
                items: [
                    ReadAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: await GeneratableCoreId.generate(),
                        attribute: IdentityAttribute.from({
                            owner: CoreAddress.from((await transportServices1.account.getIdentityInfo()).value.address),
                            value: GivenName.from("AGivenName")
                        })
                    }).toJSON()
                ]
            }
        }).toJSON()
    );
}, 30000);

afterAll(() => serviceProvider.stop());

describe("RelationshipDVO", () => {
    test("check the relationship dvo for the templator", async () => {
        const dtos = (await transportServices1.relationships.getRelationships({})).value;
        const dvos = await expander1.expandRelationshipDTOs(dtos);
        const dto = dtos[0];
        const dvo = dvos[0];
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.peer);
        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.description).toBe("i18n://dvo.relationship.Active");
        expect(dvo.type).toBe("IdentityDVO");

        expect(dvo.isSelf).toBe(false);
        expect(dvo.relationship!.id).toBe(dto.id);
        expect(dvo.relationship!.direction).toBe("Incoming");
        expect(dvo.relationship!.status).toBe("Active");
        expect(dvo.relationship!.statusText).toBe("i18n://dvo.relationship.Active");

        expect(dvo.relationship!.templateId).toBe(dto.template.id);
    });

    test("check the relationship dvo for the requestor", async () => {
        const dtos = (await transportServices2.relationships.getRelationships({})).value;
        const dvos = await expander2.expandRelationshipDTOs(dtos);
        const dto = dtos[0];
        const dvo = dvos[0];
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.peer);
        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.description).toBe("i18n://dvo.relationship.Active");
        expect(dvo.type).toBe("IdentityDVO");

        expect(dvo.isSelf).toBe(false);
        expect(dvo.relationship!.id).toBe(dto.id);
        expect(dvo.relationship!.direction).toBe("Outgoing");
        expect(dvo.relationship!.status).toBe("Active");
        expect(dvo.relationship!.statusText).toBe("i18n://dvo.relationship.Active");

        expect(dvo.relationship!.templateId).toBe(dto.template.id);
    });
});
