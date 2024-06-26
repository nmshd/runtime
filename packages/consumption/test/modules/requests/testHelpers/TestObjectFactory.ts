import { ISerializable } from "@js-soft/ts-serval";
import {
    AcceptResponseItem,
    GivenName,
    IdentityAttribute,
    IIdentityAttribute,
    IRelationshipAttribute,
    IRelationshipCreationChangeRequestContent,
    IRelationshipTemplateContent,
    IRequest,
    IResponse,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    RequestItemGroup,
    ResponseItemResult,
    ResponseJSON,
    ResponseResult
} from "@nmshd/content";
import { CoreBuffer, CryptoCipher, CryptoEncryptionAlgorithm, CryptoExchangeAlgorithm, CryptoSecretKey, CryptoSignatureAlgorithm, CryptoSignaturePublicKey } from "@nmshd/crypto";
import {
    CachedRelationship,
    CoreAddress,
    CoreDate,
    CoreId,
    ICoreId,
    Identity,
    IMessage,
    IRelationship,
    IRelationshipChange,
    IRelationshipTemplate,
    Message,
    Realm,
    Relationship,
    RelationshipChangeStatus,
    RelationshipChangeType,
    RelationshipStatus,
    RelationshipTemplate,
    RelationshipTemplatePublicKey
} from "@nmshd/transport";
import { ILocalRequest, LocalRequest, LocalRequestStatus, LocalRequestStatusLogEntry } from "../../../../src";
import { TestRequestItem } from "./TestRequestItem";

export class TestObjectFactory {
    public static createRelationship(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("id1"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    }),
                    realm: Realm.Prod
                }),
            status: properties?.status ?? RelationshipStatus.Active,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            cache:
                properties?.cache ??
                CachedRelationship.from({
                    changes: [
                        {
                            id: CoreId.from("RELCH1"),
                            type: RelationshipChangeType.Creation,
                            status: RelationshipChangeStatus.Accepted,
                            relationshipId: CoreId.from("REL1"),
                            request: {
                                createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                                content: {},
                                createdBy: CoreAddress.from("id1"),
                                createdByDevice: CoreId.from("DEV1")
                            }
                        }
                    ],
                    template: this.createIncomingRelationshipTemplate()
                })
        });
    }

    public static createIdentityAttribute(properties?: Partial<IIdentityAttribute>): IdentityAttribute {
        return IdentityAttribute.from({
            value: properties?.value ?? GivenName.fromAny({ value: "AGivenName" }),
            owner: properties?.owner ?? CoreAddress.from("id1")
        });
    }

    public static createRelationshipAttribute(properties?: Partial<IRelationshipAttribute>): RelationshipAttribute {
        return RelationshipAttribute.from({
            value: properties?.value ?? ProprietaryString.from({ title: "A Title", value: "AGivenName" }),
            confidentiality: RelationshipAttributeConfidentiality.Public,
            key: "aKey",
            isTechnical: false,
            owner: properties?.owner ?? CoreAddress.from("id1")
        });
    }

    public static createRequest(): IRequest {
        return this.createRequestWithOneItem();
    }

    public static createLocalRequestWith(params: {
        contentProperties?: Partial<Request>;
        status?: LocalRequestStatus;
        statusLogEntries?: LocalRequestStatusLogEntry[];
    }): LocalRequest {
        const requestJSON: ILocalRequest = {
            id: CoreId.from("REQ1"),
            isOwn: true,
            peer: CoreAddress.from("id11"),
            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
            content: TestObjectFactory.createRequestWithOneItem(params.contentProperties),
            source: { type: "Message", reference: CoreId.from("MSG1") },
            response: {
                createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                content: TestObjectFactory.createResponse(),
                source: { reference: CoreId.from("MSG2"), type: "Message" }
            },
            status: params.status ?? LocalRequestStatus.Draft,
            statusLog: params.statusLogEntries ?? []
        };

        const request = LocalRequest.from(requestJSON);
        return request;
    }

    public static createRequestWithOneItem(properties: Partial<Request> = {}, mustBeAccepted = false): Request {
        return Request.from({
            items: [
                TestRequestItem.from({
                    mustBeAccepted: mustBeAccepted
                })
            ],
            ...properties
        });
    }

    public static createRequestWithOneItemGroup(properties: Partial<Request> = {}, mustBeAccepted = false): Request {
        return Request.from({
            items: [
                RequestItemGroup.from({
                    items: [TestRequestItem.from({ mustBeAccepted })],
                    mustBeAccepted: mustBeAccepted
                })
            ],
            ...properties
        });
    }

    public static createRequestWithTwoItems(properties: Partial<Request> = {}): Request {
        return Request.from({
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false
                }),
                TestRequestItem.from({
                    mustBeAccepted: false
                })
            ],
            ...properties
        });
    }

    public static createResponseJSON(): ResponseJSON {
        return {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "REQ1",
            items: [
                {
                    "@type": "AcceptResponseItem",
                    result: ResponseItemResult.Accepted
                }
            ]
        };
    }

    public static createResponse(customRequestId = "REQ1"): IResponse {
        return {
            result: ResponseResult.Accepted,
            requestId: CoreId.from(customRequestId),
            items: [
                AcceptResponseItem.from({
                    result: ResponseItemResult.Accepted
                })
            ]
        };
    }

    public static createIncomingMessage(recipient: CoreAddress): Message {
        return Message.from(this.createIncomingIMessage(recipient));
    }

    public static createIncomingIMessage(recipient: CoreAddress, creationDate = CoreDate.utc(), content: ISerializable = {}): IMessage {
        return {
            // @ts-expect-error
            "@type": "Message",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            relationshipIds: [],
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: content,
                createdAt: creationDate,
                createdBy: CoreAddress.from("id1"),
                createdByDevice: { id: "senderDeviceId" },
                receivedByEveryone: false,
                recipients: [
                    {
                        address: recipient,
                        encryptedKey: CryptoCipher.from({
                            cipher: CoreBuffer.fromUtf8("test"),
                            algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                        })
                    }
                ]
            }
        };
    }

    public static createIncomingIMessageWithResponse(recipient: CoreAddress, requestId: string | ICoreId): IMessage {
        return this.createIncomingIMessage(recipient, CoreDate.utc(), {
            "@type": "Response",
            result: ResponseResult.Accepted,
            items: [
                {
                    // @ts-expect-error
                    "@type": "AcceptResponseItem",
                    result: ResponseItemResult.Accepted
                }
            ],
            requestId: CoreId.from(requestId)
        } as IResponse);
    }

    public static createOutgoingMessage(sender: CoreAddress): Message {
        return Message.from(this.createOutgoingIMessage(sender));
    }

    public static createOutgoingIMessage(sender: CoreAddress): IMessage {
        return {
            // @ts-expect-error
            "@type": "Message",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            relationshipIds: [],
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: sender,
                createdByDevice: { id: "senderDeviceId" },
                receivedByEveryone: false,
                recipients: [
                    {
                        address: CoreAddress.from("id1"),
                        encryptedKey: CryptoCipher.from({
                            cipher: CoreBuffer.fromUtf8("test"),
                            algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                        })
                    }
                ]
            }
        };
    }

    public static createIncomingRelationshipTemplate(): RelationshipTemplate {
        return RelationshipTemplate.from(this.createIncomingIRelationshipTemplate());
    }

    public static createIncomingIRelationshipChange(type: RelationshipChangeType, requestId?: string): IRelationshipChange {
        return {
            // @ts-expect-error
            "@type": "RelationshipChange",
            id: CoreId.from("RCH1"),
            relationshipId: CoreId.from("REL1"),
            type: type,
            status: RelationshipChangeStatus.Pending,
            request: {
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: CoreId.from("DVC1"),
                content: {
                    "@type": "RelationshipCreationChangeRequestContent",
                    response: {
                        "@type": "Response",
                        result: ResponseResult.Accepted,
                        items: [
                            {
                                // @ts-expect-error
                                "@type": "AcceptResponseItem",
                                result: ResponseItemResult.Accepted
                            }
                        ],
                        requestId: CoreId.from(requestId ?? "REQ1")
                    } as IResponse
                } as IRelationshipCreationChangeRequestContent
            }
        };
    }

    public static createOutgoingIRelationshipChange(type: RelationshipChangeType, sender: CoreAddress): IRelationshipChange {
        return {
            // @ts-expect-error
            "@type": "RelationshipChange",
            id: CoreId.from("RCH1"),
            relationshipId: CoreId.from("REL1"),
            type: type,
            status: RelationshipChangeStatus.Pending,
            request: {
                createdAt: CoreDate.utc(),
                createdBy: sender,
                createdByDevice: CoreId.from("DVC1")
            }
        };
    }

    public static createIncomingIRelationshipTemplate(): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: { id: "senderDeviceId" },
                maxNumberOfAllocations: 1,
                identity: {
                    address: CoreAddress.from("id1"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                    }),
                    realm: Realm.Prod
                },
                templateKey: RelationshipTemplatePublicKey.from({
                    id: CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                    algorithm: CryptoExchangeAlgorithm.ECDH_X25519,
                    publicKey: CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
                })
            }
        };
    }

    public static createOutgoingRelationshipTemplate(creator: CoreAddress): RelationshipTemplate {
        return RelationshipTemplate.from(this.createOutgoingIRelationshipTemplate(creator));
    }

    public static createOutgoingIRelationshipTemplate(creator: CoreAddress, content?: IRequest | IRelationshipTemplateContent): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: content ?? {},
                createdAt: CoreDate.utc(),
                createdBy: creator,
                createdByDevice: CoreId.from("senderDeviceId"),
                maxNumberOfAllocations: 1,
                identity: {
                    address: creator,
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                    }),
                    realm: Realm.Prod
                },
                templateKey: RelationshipTemplatePublicKey.from({
                    id: CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                    algorithm: CryptoExchangeAlgorithm.ECDH_X25519,
                    publicKey: CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
                })
            }
        };
    }
}
