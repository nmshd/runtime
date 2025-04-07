import { sleep } from "@js-soft/ts-utils";
import { AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON } from "@nmshd/consumption";
import { GivenName, IdentityAttribute, IdentityAttributeJSON, ReadAttributeRequestItem, SupportedStatusListTypes, SupportedVCTypes } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { http, HttpResponse } from "msw";
import { setupServer, SetupServerApi } from "msw/node";
import { CreateOutgoingRequestRequest } from "src";
import { cleanupAttributes, establishRelationship, exchangeAndAcceptRequestByMessage, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
const MOCK_STATUS_LIST_URI = "http://localhost:44444/status_list";
const ISSUER_LIST_BASE_URI = "http://localhost:44445/issuer_list";

let issuerServices: TestRuntimeServices;
let holderServices: TestRuntimeServices;
let verifierServices: TestRuntimeServices;
let mockServer: SetupServerApi;

let issuerListUrl: string;

beforeAll(async () => {
    const numberOfServices = 3;
    [issuerServices, holderServices, verifierServices] = await runtimeServiceProvider.launch(numberOfServices, {
        enableRequestModule: true,
        enableDeciderModule: true,
        enableNotificationModule: true
    });

    await establishRelationship(issuerServices.transport, holderServices.transport);
    await establishRelationship(verifierServices.transport, holderServices.transport);

    const issuerPublicKey = CryptoSignaturePublicKey.fromBase64((await issuerServices.transport.account.getIdentityInfo()).value.publicKey).publicKey;
    const issuerPublicMultikey = `z${CoreBuffer.from([0xed, 0x01]).append(issuerPublicKey).toBase58()}`;
    const issuerDidKey = `did/key/${issuerPublicMultikey}`;
    issuerListUrl = `${ISSUER_LIST_BASE_URI}/${issuerDidKey}`;
}, 30000);

beforeEach(() => setupMocks());

afterEach(async () => {
    await cleanupAttributes([issuerServices, holderServices, verifierServices]);
});

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

    setupMocks(statusListCredential, mediaType);

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

    setupMocks(statusListCredential, mediaType);

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

    setupMocks(revokedStatusCredential, mediaType);

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
});

test.each(Object.values(SupportedVCTypes))("expiration of a credential of type %s", async (credentialType) => {
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
        credentialType,
        expiresAt: CoreDate.utc().add({ seconds: 5 }).toString()
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
    await sleep(5000);
    await exchangeAndAcceptRequestByMessage(verifierServices, holderServices, readAttributeRequest, [readAttributeResponse]);

    const verifierAttributes = (await verifierServices.consumption.attributes.getAttributes({})).value;
    expect(verifierAttributes).toHaveLength(1);
    expect(verifierAttributes[0].content.proof).toBeDefined();
    expect(verifierAttributes[0].content.proof?.proofInvalid).toBe(true);
    expect(verifierAttributes[0].shareInfo?.peer).toBe(holderServices.address);
});

test.each(Object.values(SupportedVCTypes))("don't trust an issuer with credential of type %s", async (credentialType) => {
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

    setupMocks(undefined, undefined, true);

    await exchangeAndAcceptRequestByMessage(verifierServices, holderServices, readAttributeRequest, [readAttributeResponse]);

    const verifierAttributes = (await verifierServices.consumption.attributes.getAttributes({})).value;
    expect(verifierAttributes).toHaveLength(1);
    expect(verifierAttributes[0].content.proof).toBeDefined();
    expect(verifierAttributes[0].content.proof?.proofInvalid).toBe(true);
    expect(verifierAttributes[0].shareInfo?.peer).toBe(holderServices.address);
});

function setupMocks(statusListCredential?: any, mediaType?: string, issuerUntrusted?: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (mockServer) mockServer.close();

    const handlers = [];
    handlers.push(
        http.get(issuerListUrl, () => {
            return new HttpResponse(null, {
                status: issuerUntrusted ? 404 : 200
            });
        })
    );
    if (statusListCredential && mediaType) {
        handlers.push(
            http.get(MOCK_STATUS_LIST_URI, () => {
                return (HttpResponse as any)[mediaType](statusListCredential);
            })
        );
    }

    mockServer = setupServer(...handlers);
    mockServer.listen({ onUnhandledRequest: "bypass" });
}
