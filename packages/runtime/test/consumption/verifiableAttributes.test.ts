import { AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON } from "@nmshd/consumption";
import { GivenName, IdentityAttribute, IdentityAttributeJSON, ReadAttributeRequestItem, SupportedStatusListTypes, SupportedVCTypes } from "@nmshd/content";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CreateOutgoingRequestRequest } from "src";
import { cleanupAttributes, establishRelationship, exchangeAndAcceptRequestByMessage, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
const MOCK_STATUS_LIST_URI = "http://localhost:44444/status_list";

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

afterEach(async () => await cleanupAttributes([issuerServices, holderServices, verifierServices]));

afterAll(async () => await runtimeServiceProvider.stop());

test.each(Object.values(SupportedVCTypes))("issue and present a credential of type %s", async (credentialType) => {
    const unsignedAttribute = IdentityAttribute.from({
        owner: holderServices.address,
        value: GivenName.from({
            value: "aGivenName"
        }).toJSON()
    }).toJSON();

    const signingResult = await issuerServices.consumption.attributes.createCreateVerifiableAttributeRequestItem({
        content: unsignedAttribute,
        peer: holderServices.address,
        mustBeAccepted: false,
        credentialType
    });

    expect(signingResult).toBeSuccessful();
    const requestItem = signingResult.value.requestItem;
    expect(requestItem.attribute.proof).toBeDefined();

    const request: CreateOutgoingRequestRequest = {
        peer: holderServices.address,
        content: {
            items: [requestItem]
        }
    };
    await exchangeAndAcceptRequestByMessage(issuerServices, holderServices, request, [{ accept: true }]);

    const attributes = (await holderServices.consumption.attributes.getAttributes({})).value;
    expect(attributes).toHaveLength(3);
    expect(attributes[0].content.proof).toBeDefined();
    expect(attributes[0].shareInfo).toBeUndefined();
    expect(attributes[1].content.proof).toBeUndefined();
    expect(attributes[1].shareInfo).toBeUndefined();
    expect(attributes[2].content.proof).toBeDefined();
    expect(attributes[2].shareInfo?.peer).toBe(issuerServices.address);

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

test.each([
    [SupportedVCTypes.SdJwtVc, SupportedStatusListTypes.TokenStatusList, "text"],
    [SupportedVCTypes.W3CVC, SupportedStatusListTypes.BitstringStatusList, "json"]
])("issue and present a credential of type %s with %s", async (vcType, statusListType, mediaType) => {
    const unsignedAttribute = IdentityAttribute.from({
        owner: holderServices.address,
        value: GivenName.from({
            value: "aGivenName"
        }).toJSON()
    }).toJSON();

    const signingResult = await issuerServices.consumption.attributes.createCreateVerifiableAttributeRequestItem({
        content: unsignedAttribute,
        peer: holderServices.address,
        mustBeAccepted: false,
        credentialType: vcType,
        statusList: { uri: MOCK_STATUS_LIST_URI, type: statusListType }
    });

    expect(signingResult).toBeSuccessful();
    const requestItem = signingResult.value.requestItem;
    expect(requestItem.attribute.proof).toBeDefined();
    const statusListCredential = signingResult.value.statusListCredential;
    expect(statusListCredential).toBeDefined();

    const getStatusListHandler = http.get(MOCK_STATUS_LIST_URI, () => {
        return (HttpResponse as any)[mediaType](statusListCredential);
    });
    const getStatusListServer = setupServer(getStatusListHandler);
    getStatusListServer.listen({ onUnhandledRequest: "bypass" });

    const request: CreateOutgoingRequestRequest = {
        peer: holderServices.address,
        content: {
            items: [requestItem]
        }
    };
    await exchangeAndAcceptRequestByMessage(issuerServices, holderServices, request, [{ accept: true }]);

    const attributes = (await holderServices.consumption.attributes.getAttributes({})).value;
    expect(attributes).toHaveLength(3);
    expect(attributes[0].content.proof).toBeDefined();
    expect(attributes[0].shareInfo).toBeUndefined();
    expect(attributes[1].content.proof).toBeUndefined();
    expect(attributes[1].shareInfo).toBeUndefined();
    expect(attributes[2].content.proof).toBeDefined();
    expect(attributes[2].shareInfo?.peer).toBe(issuerServices.address);

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

    getStatusListServer.close();
});
test.each([
    [SupportedVCTypes.SdJwtVc, SupportedStatusListTypes.TokenStatusList, "text"],
    [SupportedVCTypes.W3CVC, SupportedStatusListTypes.BitstringStatusList, "json"]
])("don't accept a revoked credential of type %s with %s", async (vcType, statusListType, mediaType) => {
    const unsignedAttribute = IdentityAttribute.from({
        owner: holderServices.address,
        value: GivenName.from({
            value: "aGivenName"
        }).toJSON()
    }).toJSON();

    const signingResult = await issuerServices.consumption.attributes.createCreateVerifiableAttributeRequestItem({
        content: unsignedAttribute,
        peer: holderServices.address,
        mustBeAccepted: false,
        credentialType: vcType,
        statusList: { uri: MOCK_STATUS_LIST_URI, type: statusListType }
    });

    expect(signingResult).toBeSuccessful();
    const requestItem = signingResult.value.requestItem;
    expect(requestItem.attribute.proof).toBeDefined();
    const statusListCredential = signingResult.value.statusListCredential;
    expect(statusListCredential).toBeDefined();

    const getStatusListHandler = http.get(MOCK_STATUS_LIST_URI, () => {
        return (HttpResponse as any)[mediaType](statusListCredential);
    });
    const getStatusListServer = setupServer(getStatusListHandler);
    getStatusListServer.listen({ onUnhandledRequest: "bypass" });

    const request: CreateOutgoingRequestRequest = {
        peer: holderServices.address,
        content: {
            items: [requestItem]
        }
    };
    await exchangeAndAcceptRequestByMessage(issuerServices, holderServices, request, [{ accept: true }]);

    const attributes = (await holderServices.consumption.attributes.getAttributes({})).value;
    expect(attributes).toHaveLength(3);

    const revocationResult = await issuerServices.consumption.attributes.revokeAttribute({ attribute: requestItem.attribute as IdentityAttributeJSON });
    const revokedStatusCredential = revocationResult.value;
    expect(revokedStatusCredential).toBeDefined();

    getStatusListServer.close();
    const getRevokedStatusListHandler = http.get(MOCK_STATUS_LIST_URI, () => {
        return (HttpResponse as any)[mediaType](revokedStatusCredential);
    });
    const getRevokedStatusListServer = setupServer(getRevokedStatusListHandler);
    getRevokedStatusListServer.listen({ onUnhandledRequest: "bypass" });

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
    expect(verifierAttributes[0].content.proof?.proofInvalid).toBe(true);
    expect(verifierAttributes[0].shareInfo?.peer).toBe(holderServices.address);

    getRevokedStatusListServer.close();
});
