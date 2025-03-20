import { AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON } from "@nmshd/consumption";
import { GivenName, IdentityAttribute, ReadAttributeRequestItem } from "@nmshd/content";
import { CreateOutgoingRequestRequest } from "src";
import { establishRelationship, exchangeAndAcceptRequestByMessage, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let issuerServices: TestRuntimeServices;
let holderServices: TestRuntimeServices;
let verifierServices: TestRuntimeServices;

beforeAll(async () => {
    const numberOfServices = 3;
    [issuerServices, holderServices, verifierServices] = await runtimeServiceProvider.launch(numberOfServices, {
        enableRequestModule: true,
        enableDeciderModule: true,
        enableNotificationModule: true
    });

    await establishRelationship(issuerServices.transport, holderServices.transport);
    await establishRelationship(verifierServices.transport, holderServices.transport);
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

test("issue a credential", async () => {
    const unsignedAttribute = IdentityAttribute.from({
        owner: holderServices.address,
        value: GivenName.from({
            value: "aGivenName"
        }).toJSON()
    }).toJSON();

    const signingResult = await issuerServices.consumption.attributes.createCreateVerifiableAttributeRequestItem({
        content: unsignedAttribute,
        peer: holderServices.address,
        mustBeAccepted: false
    });

    expect(signingResult).toBeSuccessful();
    const requestItem = signingResult.value;
    expect(requestItem.attribute.proof).toBeDefined();

    const request: CreateOutgoingRequestRequest = {
        peer: holderServices.address,
        content: {
            items: [requestItem]
        }
    };
    await exchangeAndAcceptRequestByMessage(issuerServices, holderServices, request, [{ accept: true }]);

    const attributes = (await holderServices.consumption.attributes.getAttributes({})).value;
    expect(attributes).toHaveLength(2);
    expect(attributes[0].content.proof).toBeDefined();
    expect(attributes[0].shareInfo).toBeUndefined();
    expect(attributes[1].content.proof).toBeDefined();
    expect(attributes[1].shareInfo?.peer).toBe(issuerServices.address);

    const readAttributeRequestItem = ReadAttributeRequestItem.from({
        mustBeAccepted: false,
        query: {
            "@type": "IdentityAttributeQuery",
            valueType: "GivenName",
            isVerified: true
        }
    }).toJSON();
    const readAttributeRequest: CreateOutgoingRequestRequest = {
        peer: holderServices.address,
        content: {
            items: [readAttributeRequestItem]
        }
    };
    const readAttributeResponse: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
        accept: true,
        existingAttributeId: attributes[0].id
    };
    await exchangeAndAcceptRequestByMessage(verifierServices, holderServices, readAttributeRequest, [readAttributeResponse]);

    const verifierAttributes = (await verifierServices.consumption.attributes.getAttributes({})).value;
    expect(verifierAttributes).toHaveLength(1);
    expect(verifierAttributes[0].content.proof).toBeDefined();
    expect(verifierAttributes[0].content.proof?.proofInvalid).toBeUndefined();
    expect(verifierAttributes[0].shareInfo?.peer).toBe(holderServices.address);
});
