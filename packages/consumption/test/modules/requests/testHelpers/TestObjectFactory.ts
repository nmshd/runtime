import { ISerializable } from "@js-soft/ts-serval";
import {
    AcceptResponseItem,
    GivenName,
    IdentityAttribute,
    IIdentityAttribute,
    IRelationshipAttribute,
    IRelationshipTemplateContent,
    IRequest,
    IResponse,
    ProprietaryString,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    RequestItemGroup,
    ResponseItemDerivations,
    ResponseItemResult,
    ResponseJSON,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoEncryptionAlgorithm, CryptoExchangeAlgorithm, CryptoSecretKey, CryptoSignatureAlgorithm, CryptoSignaturePublicKey } from "@nmshd/crypto";
import {
    Identity,
    IMessage,
    IRelationship,
    IRelationshipTemplate,
    Message,
    PeerDeletionInfo,
    PeerDeletionStatus,
    Relationship,
    RelationshipAuditLogEntryReason,
    RelationshipStatus,
    RelationshipTemplate,
    RelationshipTemplatePublicKey
} from "@nmshd/transport";
import { ILocalRequest, LocalRequest, LocalRequestStatus, LocalRequestStatusLogEntry } from "../../../../src";
import { TestRequestItem } from "./TestRequestItem";

export class TestObjectFactory {
    public static createPendingRelationship(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    })
                }),
            status: properties?.status ?? RelationshipStatus.Pending,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            creationContent: {},
            auditLog: [
                {
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Creation,
                    newStatus: RelationshipStatus.Pending
                }
            ],
            templateId: { id: "b9uMR7u7lsKLzRfVJNYb" }
        });
    }

    public static createActiveRelationship(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    })
                }),
            status: properties?.status ?? RelationshipStatus.Active,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            creationContent: {},
            auditLog: [
                {
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Creation,
                    newStatus: RelationshipStatus.Pending
                },

                {
                    createdAt: CoreDate.from("2020-01-02T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.AcceptanceOfCreation,
                    oldStatus: RelationshipStatus.Pending,
                    newStatus: RelationshipStatus.Active
                }
            ],
            templateId: { id: "b9uMR7u7lsKLzRfVJNYb" }
        });
    }

    public static createTerminatedRelationship(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    })
                }),
            status: properties?.status ?? RelationshipStatus.Terminated,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            creationContent: {},
            auditLog: [
                {
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Creation,
                    newStatus: RelationshipStatus.Pending
                },

                {
                    createdAt: CoreDate.from("2020-01-02T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.AcceptanceOfCreation,
                    oldStatus: RelationshipStatus.Pending,
                    newStatus: RelationshipStatus.Active
                },

                {
                    createdAt: CoreDate.from("2020-01-03T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Termination,
                    oldStatus: RelationshipStatus.Active,
                    newStatus: RelationshipStatus.Terminated
                }
            ],
            templateId: { id: "b9uMR7u7lsKLzRfVJNYb" }
        });
    }

    public static createRelationshipToPeerInDeletion(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    })
                }),
            peerDeletionInfo:
                properties?.peerDeletionInfo ??
                PeerDeletionInfo.from({
                    deletionStatus: PeerDeletionStatus.ToBeDeleted,
                    deletionDate: CoreDate.from("2100-01-03T00:00:00.000Z")
                }),
            status: properties?.status ?? RelationshipStatus.Active,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            creationContent: {},
            auditLog: [
                {
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Creation,
                    newStatus: RelationshipStatus.Pending
                },

                {
                    createdAt: CoreDate.from("2020-01-02T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.AcceptanceOfCreation,
                    oldStatus: RelationshipStatus.Pending,
                    newStatus: RelationshipStatus.Active
                }
            ],
            templateId: CoreId.from("aTemplateId")
        });
    }

    public static createRelationshipToDeletedPeer(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    })
                }),
            peerDeletionInfo:
                properties?.peerDeletionInfo ??
                PeerDeletionInfo.from({
                    deletionStatus: PeerDeletionStatus.Deleted,
                    deletionDate: CoreDate.from("2022-01-03T00:00:00.000Z")
                }),
            status: properties?.status ?? RelationshipStatus.DeletionProposed,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            creationContent: {},
            auditLog: [
                {
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Creation,
                    newStatus: RelationshipStatus.Pending
                },

                {
                    createdAt: CoreDate.from("2020-01-02T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.AcceptanceOfCreation,
                    oldStatus: RelationshipStatus.Pending,
                    newStatus: RelationshipStatus.Active
                },

                {
                    createdAt: CoreDate.from("2022-01-03T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.DecompositionDueToIdentityDeletion,
                    oldStatus: RelationshipStatus.Active,
                    newStatus: RelationshipStatus.DeletionProposed
                }
            ],
            templateId: CoreId.from("aTemplateId")
        });
    }

    public static createDeletionProposedRelationship(properties?: Partial<IRelationship>): Relationship {
        return Relationship.from({
            id: properties?.id ?? CoreId.from("REL1"),
            peer:
                properties?.peer ??
                Identity.from({
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.from("L1sPFQgS5CxgGs1ejBcWCQLCpeFXbRc1TQnSpuHQqDQ")
                    })
                }),
            status: properties?.status ?? RelationshipStatus.DeletionProposed,
            relationshipSecretId: properties?.relationshipSecretId ?? CoreId.from("RELSEC1"),
            creationContent: {},
            auditLog: [
                {
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Creation,
                    newStatus: RelationshipStatus.Pending
                },

                {
                    createdAt: CoreDate.from("2020-01-02T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.AcceptanceOfCreation,
                    oldStatus: RelationshipStatus.Pending,
                    newStatus: RelationshipStatus.Active
                },

                {
                    createdAt: CoreDate.from("2020-01-03T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Termination,
                    oldStatus: RelationshipStatus.Active,
                    newStatus: RelationshipStatus.Terminated
                },

                {
                    createdAt: CoreDate.from("2020-01-04T00:00:00.000Z"),
                    createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity2"),
                    createdByDevice: CoreId.from("DVC1"),
                    reason: RelationshipAuditLogEntryReason.Decomposition,
                    oldStatus: RelationshipStatus.Terminated,
                    newStatus: RelationshipStatus.DeletionProposed
                }
            ],
            templateId: { id: "b9uMR7u7lsKLzRfVJNYb" }
        });
    }

    public static createIdentityAttribute(properties?: Partial<IIdentityAttribute>): IdentityAttribute {
        return IdentityAttribute.from({
            value: properties?.value ?? GivenName.fromAny({ value: "aGivenName" }),
            tags: properties?.tags,
            owner: properties?.owner ?? CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
    }

    public static createRelationshipAttribute(properties?: Partial<IRelationshipAttribute>): RelationshipAttribute {
        return RelationshipAttribute.from({
            value: properties?.value ?? ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" }),
            confidentiality: properties?.confidentiality ?? RelationshipAttributeConfidentiality.Public,
            key: properties?.key ?? "aKey",
            isTechnical: properties?.isTechnical ?? false,
            owner: properties?.owner ?? CoreAddress.from("did:e:a-domain:dids:anidentity")
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
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity"),
            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
            content: TestObjectFactory.createRequestWithOneItem(params.contentProperties),
            source: { type: "Message", reference: CoreId.from("MSG1") },
            response: {
                createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                content: TestObjectFactory.createResponse(),
                source: { reference: CoreId.from("MSG2"), type: "Message" }
            },
            status: params.status ?? LocalRequestStatus.Decided,
            statusLog: params.statusLogEntries ?? []
        };

        const request = LocalRequest.from(requestJSON);
        return request;
    }

    public static createUnansweredLocalRequestBasedOnTemplateWith(params: {
        contentProperties?: Partial<Request>;
        status?: LocalRequestStatus;
        statusLogEntries?: LocalRequestStatusLogEntry[];
    }): LocalRequest {
        if (params.status && [LocalRequestStatus.Decided, LocalRequestStatus.Completed].includes(params.status)) {
            throw new Error("An unanswered LocalRequest cannot be 'Decided' or 'Completed'.");
        }

        const requestJSON: ILocalRequest = {
            id: CoreId.from("REQ1"),
            isOwn: false,
            peer: CoreAddress.from("did:e:a-domain:dids:sender"),
            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
            content: TestObjectFactory.createRequestWithOneItem(params.contentProperties),
            source: { type: "RelationshipTemplate", reference: CoreId.from("RLT1") },
            status: params.status ?? LocalRequestStatus.ManualDecisionRequired,
            statusLog: params.statusLogEntries ?? []
        };

        const request = LocalRequest.from(requestJSON);
        return request;
    }

    public static createRejectedLocalRequestBasedOnTemplateWith(params: {
        contentProperties?: Partial<Request>;
        status?: LocalRequestStatus;
        statusLogEntries?: LocalRequestStatusLogEntry[];
    }): LocalRequest {
        if (params.status && ![LocalRequestStatus.Decided, LocalRequestStatus.Completed, LocalRequestStatus.Expired].includes(params.status)) {
            throw new Error("A rejected LocalRequest must be 'Decided', 'Completed' or 'Expired'.");
        }

        const requestJSON: ILocalRequest = {
            id: CoreId.from("REQ1"),
            isOwn: false,
            peer: CoreAddress.from("did:e:a-domain:dids:sender"),
            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
            content: TestObjectFactory.createRequestWithOneItem(params.contentProperties),
            source: { type: "RelationshipTemplate", reference: CoreId.from("RLT1") },
            response: {
                createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                content: TestObjectFactory.createResponse("REQ1", ResponseResult.Rejected)
            },
            status: params.status ?? LocalRequestStatus.Decided,
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
                    items: [TestRequestItem.from({ mustBeAccepted })]
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

    public static createResponse(customRequestId = "REQ1", result: ResponseResult = ResponseResult.Accepted): IResponse {
        let responseItem: ResponseItemDerivations = AcceptResponseItem.from({
            result: ResponseItemResult.Accepted
        });

        if (result === ResponseResult.Rejected) {
            responseItem = RejectResponseItem.from({
                result: ResponseItemResult.Rejected
            });
        }

        return {
            result: result,
            requestId: CoreId.from(customRequestId),
            items: [responseItem]
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
            content: content,
            createdAt: creationDate,
            createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
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
            content: {},
            createdAt: CoreDate.utc(),
            createdBy: sender,
            createdByDevice: { id: "senderDeviceId" },
            receivedByEveryone: false,
            recipients: [
                {
                    address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                    encryptedKey: CryptoCipher.from({
                        cipher: CoreBuffer.fromUtf8("test"),
                        algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                        nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                    })
                }
            ]
        };
    }

    public static createIncomingRelationshipTemplate(expiresAt?: CoreDate): RelationshipTemplate {
        return RelationshipTemplate.from(this.createIncomingIRelationshipTemplate(expiresAt));
    }

    public static createIncomingIRelationshipTemplate(expiresAt?: CoreDate): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            content: {},
            createdAt: CoreDate.utc(),
            createdBy: CoreAddress.from("did:e:a-domain:dids:anidentity"),
            createdByDevice: { id: "senderDeviceId" },
            maxNumberOfAllocations: 1,
            expiresAt,
            identity: {
                address: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                publicKey: CryptoSignaturePublicKey.from({
                    algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                    publicKey: CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                })
            },
            templateKey: RelationshipTemplatePublicKey.from({
                id: CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                algorithm: CryptoExchangeAlgorithm.ECDH_X25519,
                publicKey: CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
            })
        };
    }

    public static createOutgoingRelationshipTemplate(creator: CoreAddress): RelationshipTemplate {
        return RelationshipTemplate.from(this.createOutgoingIRelationshipTemplate(creator));
    }

    public static createOutgoingIRelationshipTemplate(creator: CoreAddress, content?: IRelationshipTemplateContent): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
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
                })
            },
            templateKey: RelationshipTemplatePublicKey.from({
                id: CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                algorithm: CryptoExchangeAlgorithm.ECDH_X25519,
                publicKey: CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
            })
        };
    }
}
