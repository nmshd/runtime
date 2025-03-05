import { Event, EventBus, Result, sleep, SubscriptionTarget } from "@js-soft/ts-utils";
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptRequestItemParametersJSON,
    ConsumptionIds,
    DecideRequestItemGroupParametersJSON,
    DecideRequestItemParametersJSON,
    DecideRequestParametersJSON
} from "@nmshd/consumption";
import {
    ArbitraryRelationshipCreationContent,
    ArbitraryRelationshipCreationContentJSON,
    ArbitraryRelationshipTemplateContent,
    ArbitraryRelationshipTemplateContentJSON,
    INotificationItem,
    Notification,
    RelationshipCreationContent,
    RelationshipTemplateContentJSON,
    Request,
    RequestItemGroupJSON,
    RequestItemJSONDerivations,
    RequestJSON,
    ResponseWrapperJSON,
    ShareAttributeAcceptResponseItemJSON,
    ShareAttributeRequestItem
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { IdentityUtil } from "@nmshd/transport";
import fs from "fs";
import _ from "lodash";
import { DateTime } from "luxon";
import {
    ConsumptionServices,
    CreateAndShareRelationshipAttributeRequest,
    CreateOutgoingRequestRequest,
    CreateRepositoryAttributeRequest,
    CreateTokenForFileRequest,
    CreateTokenQRCodeForFileRequest,
    FileDTO,
    IdentityDeletionProcessDTO,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    LocalNotificationDTO,
    LocalRequestStatus,
    MessageContentDerivation,
    MessageDTO,
    MessageSentEvent,
    NotifyPeerAboutRepositoryAttributeSuccessionRequest,
    NotifyPeerAboutRepositoryAttributeSuccessionResponse,
    OutgoingRequestStatusChangedEvent,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RelationshipChangedEvent,
    RelationshipDTO,
    RelationshipStatus,
    RelationshipTemplateDTO,
    RelationshipTemplateProcessedEvent,
    ShareRepositoryAttributeRequest,
    SucceedRepositoryAttributeRequest,
    SucceedRepositoryAttributeResponse,
    SyncEverythingResponse,
    TokenDTO,
    TransportServices,
    UploadOwnFileRequest
} from "../../src";
import { TestRuntimeServices } from "./RuntimeServiceProvider";
import { TestNotificationItem } from "./TestNotificationItem";

export async function syncUntil(transportServices: TransportServices, until: (syncResult: SyncEverythingResponse) => boolean): Promise<SyncEverythingResponse> {
    const finalSyncResult: SyncEverythingResponse = { messages: [], relationships: [], identityDeletionProcesses: [] };

    let iterationNumber = 0;
    let criteriaMet: boolean;
    do {
        await sleep(iterationNumber * 25);

        const currentIterationSyncResult = (await transportServices.account.syncEverything()).value;

        finalSyncResult.messages.push(...currentIterationSyncResult.messages);
        finalSyncResult.relationships.push(...currentIterationSyncResult.relationships);
        finalSyncResult.identityDeletionProcesses.push(...currentIterationSyncResult.identityDeletionProcesses);

        iterationNumber++;
        criteriaMet = until(finalSyncResult);
    } while (!criteriaMet && iterationNumber < 15);
    if (!criteriaMet) throw new Error("syncUntil timed out.");
    return finalSyncResult;
}

async function syncUntilHas<T extends keyof SyncEverythingResponse>(
    transportServices: TransportServices,
    key: T,
    // [0] is to infer the type of one element of the generic array
    filter: (r: SyncEverythingResponse[T][0]) => boolean
): Promise<SyncEverythingResponse[T][0]> {
    const syncResult = await syncUntil(transportServices, (syncResult) => syncResult[key].some((r) => filter(r)));
    return syncResult[key].filter(filter)[0];
}

async function syncUntilHasMany<T extends keyof SyncEverythingResponse>(
    transportServices: TransportServices,
    key: T,
    expectedNumberOfItems = 1
): Promise<SyncEverythingResponse[T]> {
    const syncResult = await syncUntil(transportServices, (syncResult) => syncResult[key].length >= expectedNumberOfItems);
    return syncResult[key];
}

export async function syncUntilHasRelationships(transportServices: TransportServices, expectedNumberOfRelationships = 1): Promise<RelationshipDTO[]> {
    return await syncUntilHasMany(transportServices, "relationships", expectedNumberOfRelationships);
}

export async function syncUntilHasMessages(transportServices: TransportServices, expectedNumberOfMessages = 1): Promise<MessageDTO[]> {
    return await syncUntilHasMany(transportServices, "messages", expectedNumberOfMessages);
}

export async function syncUntilHasMessage(transportServices: TransportServices, messageId: string | CoreId): Promise<MessageDTO> {
    return await syncUntilHas(transportServices, "messages", (m) => m.id === messageId.toString());
}

export async function syncUntilHasMessageWithRequest(transportServices: TransportServices, requestId: string | CoreId): Promise<MessageDTO & { content: RequestJSON }> {
    return (await syncUntilHas(transportServices, "messages", (m) => m.content["@type"] === "Request" && m.content.id === requestId.toString())) as MessageDTO & {
        content: RequestJSON;
    };
}

export async function syncUntilHasMessageWithResponse(transportServices: TransportServices, requestId: string | CoreId): Promise<MessageDTO & { content: ResponseWrapperJSON }> {
    return (await syncUntilHas(transportServices, "messages", (m) => m.content["@type"] === "ResponseWrapper" && m.content.requestId === requestId.toString())) as MessageDTO & {
        content: ResponseWrapperJSON;
    };
}

export async function syncUntilHasMessageWithNotification(transportServices: TransportServices, notificationId: string | CoreId): Promise<MessageDTO> {
    return await syncUntilHas(transportServices, "messages", (m) => m.content["@type"] === "Notification" && m.content.id === notificationId.toString());
}

export async function syncUntilHasIdentityDeletionProcess(transportServices: TransportServices, identityDeletionProcessId: string | CoreId): Promise<IdentityDeletionProcessDTO> {
    return await syncUntilHas(transportServices, "identityDeletionProcesses", (m) => m.id === identityDeletionProcessId.toString());
}

export async function syncUntilHasEvent<TEvent extends Event>(
    runtimeServices: TestRuntimeServices,
    subscriptionTarget: SubscriptionTarget<TEvent> & { namespace: string },
    predicate?: (event: TEvent) => boolean
): Promise<Event> {
    let iterationNumber = 0;
    let event: Event | undefined;
    do {
        await sleep(iterationNumber * 25);

        await runtimeServices.transport.account.syncEverything();
        event = runtimeServices.eventBus.publishedEvents.find(
            (e) =>
                e.namespace === subscriptionTarget.namespace &&
                (typeof subscriptionTarget === "string" || e instanceof subscriptionTarget) &&
                (!predicate || predicate(e as TEvent))
        ) as TEvent | undefined;

        iterationNumber++;
    } while (!event && iterationNumber < 15);
    if (!event) throw new Error("syncUntil timed out.");
    return event;
}

export async function uploadOwnToken(
    transportServices: TransportServices,
    forIdentity?: string,
    passwordProtection?: { password: string; passwordIsPin?: true }
): Promise<TokenDTO> {
    const response = await transportServices.tokens.createOwnToken({
        content: { aKey: "aValue" },
        expiresAt: DateTime.utc().plus({ days: 1 }).toString(),
        ephemeral: false,
        forIdentity,
        passwordProtection
    });

    expect(response).toBeSuccessful();

    return response.value;
}

export async function uploadFile(transportServices: TransportServices): Promise<FileDTO> {
    const response = await transportServices.files.uploadOwnFile(await makeUploadRequest());

    expect(response).toBeSuccessful();

    return response.value;
}

export function createToken(
    transportServices: TransportServices,
    request: CreateTokenForFileRequest | CreateTokenQRCodeForFileRequest,
    tokenType: "file" | "qrcode"
): Promise<any> {
    switch (tokenType) {
        case "file":
            return transportServices.files.createTokenForFile(request as CreateTokenForFileRequest);
        case "qrcode":
            return transportServices.files.createTokenQRCodeForFile(request as CreateTokenQRCodeForFileRequest);
    }
}

// Override the default upload request with values
export async function makeUploadRequest(values: object = {}): Promise<UploadOwnFileRequest> {
    return {
        title: "File Title",
        filename: "test.txt",
        content: await fs.promises.readFile(`${__dirname}/../__assets__/test.txt`),
        mimetype: "text/plain",
        description: "This is a valid file description",
        expiresAt: DateTime.utc().plus({ minutes: 5 }).toString(),
        ...values
    };
}

export const emptyRelationshipTemplateContent: ArbitraryRelationshipTemplateContentJSON = ArbitraryRelationshipTemplateContent.from({ value: {} }).toJSON();

export const emptyRelationshipCreationContent: ArbitraryRelationshipCreationContentJSON = ArbitraryRelationshipCreationContent.from({ value: {} }).toJSON();

export async function createTemplate(
    transportServices: TransportServices,
    body?: RelationshipTemplateContentJSON,
    passwordProtection?: { password: string; passwordIsPin?: true },
    templateExpiresAt?: DateTime
): Promise<RelationshipTemplateDTO> {
    const defaultExpirationDateTime = DateTime.utc().plus({ minutes: 10 }).toString();

    const response = await transportServices.relationshipTemplates.createOwnRelationshipTemplate({
        maxNumberOfAllocations: 1,
        expiresAt: templateExpiresAt ? templateExpiresAt.toString() : defaultExpirationDateTime,
        content: _.cloneDeep(body) ?? emptyRelationshipTemplateContent,
        passwordProtection
    });

    expect(response).toBeSuccessful();

    return response.value;
}

export async function getFileToken(transportServices: TransportServices): Promise<TokenDTO> {
    const file = await uploadFile(transportServices);

    const response = await transportServices.files.createTokenForFile({ fileId: file.id });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function exchangeTemplate(
    transportServicesCreator: TransportServices,
    transportServicesRecipient: TransportServices,
    content?: RelationshipTemplateContentJSON,
    templateExpiresAt?: DateTime
): Promise<RelationshipTemplateDTO> {
    const template = await createTemplate(transportServicesCreator, content, undefined, templateExpiresAt);

    const response = await transportServicesRecipient.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function exchangeFile(transportServicesCreator: TransportServices, transportServicesRecipient: TransportServices): Promise<FileDTO> {
    const fileToken = await getFileToken(transportServicesCreator);

    const response = await transportServicesRecipient.files.getOrLoadFile({ reference: fileToken.truncatedReference });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function exchangeToken(transportServicesCreator: TransportServices, transportServicesRecipient: TransportServices): Promise<TokenDTO> {
    const token = await uploadOwnToken(transportServicesCreator);

    const response = await transportServicesRecipient.tokens.loadPeerToken({
        reference: token.truncatedReference,
        ephemeral: false
    });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function sendMessage(transportServices: TransportServices, recipient: string, content?: MessageContentDerivation, attachments?: string[]): Promise<MessageDTO> {
    const response = await transportServices.messages.sendMessage({
        recipients: [recipient],
        content: content ?? {
            "@type": "Mail",
            subject: "aSubject",
            body: "aBody",
            cc: [],
            to: [recipient]
        },
        attachments
    });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function sendMessageToMultipleRecipients(
    transportServices: TransportServices,
    recipients: string[],
    content?: any,
    attachments?: string[]
): Promise<Result<MessageDTO>> {
    const response = await transportServices.messages.sendMessage({
        recipients,
        content: content ?? {
            "@type": "Mail",
            subject: "aSubject",
            body: "aBody",
            cc: [],
            to: recipients
        },
        attachments
    });

    return response;
}

export async function sendMessageWithRequest(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest
): Promise<MessageDTO & { content: RequestJSON }> {
    const createRequestResult = await sender.consumption.outgoingRequests.create(request);
    expect(createRequestResult).toBeSuccessful();
    const sendMessageResult = await sender.transport.messages.sendMessage({
        recipients: [recipient.address],
        content: createRequestResult.value.content
    });
    expect(sendMessageResult).toBeSuccessful();

    return sendMessageResult.value as MessageDTO & { content: RequestJSON };
}

export async function exchangeMessage(transportServicesCreator: TransportServices, transportServicesRecipient: TransportServices, attachments?: string[]): Promise<MessageDTO> {
    const recipientAddress = (await transportServicesRecipient.account.getIdentityInfo()).value.address;
    const messageId = (await sendMessage(transportServicesCreator, recipientAddress, undefined, attachments)).id;
    const messages = await syncUntilHasMessages(transportServicesRecipient);
    expect(messages).toHaveLength(1);

    const message = messages[0];
    expect(message.id).toStrictEqual(messageId);

    return message;
}

export async function exchangeMessageWithRequest(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest
): Promise<MessageDTO & { content: RequestJSON }> {
    const sentMessage = await sendMessageWithRequest(sender, recipient, request);
    return await syncUntilHasMessageWithRequest(recipient.transport, sentMessage.content.id!);
}

export async function exchangeMessageWithAttachment(transportServicesCreator: TransportServices, transportServicesRecipient: TransportServices): Promise<MessageDTO> {
    const file = await uploadFile(transportServicesCreator);

    return await exchangeMessage(transportServicesCreator, transportServicesRecipient, [file.id]);
}

export async function getRelationship(transportServices: TransportServices): Promise<RelationshipDTO> {
    const response = await transportServices.relationships.getRelationships({});

    expect(response).toBeSuccessful();
    expect(response.value).toHaveLength(1);

    return response.value[0];
}

export async function establishRelationship(transportServices1: TransportServices, transportServices2: TransportServices): Promise<RelationshipDTO> {
    const template = await exchangeTemplate(transportServices1, transportServices2);

    const createRelationshipResponse = await transportServices2.relationships.createRelationship({
        templateId: template.id,
        creationContent: emptyRelationshipCreationContent
    });
    expect(createRelationshipResponse).toBeSuccessful();

    const relationships = await syncUntilHasRelationships(transportServices1);
    expect(relationships).toHaveLength(1);

    const acceptResponse = await transportServices1.relationships.acceptRelationship({
        relationshipId: relationships[0].id
    });
    expect(acceptResponse).toBeSuccessful();

    const relationships2 = await syncUntilHasRelationships(transportServices2);
    expect(relationships2).toHaveLength(1);
    return relationships2[0];
}

export async function establishRelationshipWithContents(
    runtimeServices1: TestRuntimeServices,
    runtimeServices2: TestRuntimeServices,
    templateContent?: RelationshipTemplateContentJSON,
    acceptRequestItemsParameters?: (AcceptRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<void> {
    const template = await exchangeTemplate(runtimeServices1.transport, runtimeServices2.transport, templateContent);
    let creationContent;

    if (templateContent && acceptRequestItemsParameters) {
        const receivedRequest = (
            await runtimeServices2.consumption.incomingRequests.received({
                receivedRequest: templateContent.onNewRelationship,
                requestSourceId: template.id
            })
        ).value;

        const checkedRequest = (
            await runtimeServices2.consumption.incomingRequests.checkPrerequisites({
                requestId: receivedRequest.id
            })
        ).value;

        const manualDecisionRequiredRequest = (
            await runtimeServices2.consumption.incomingRequests.requireManualDecision({
                requestId: checkedRequest.id
            })
        ).value;

        const acceptedRequest = await runtimeServices2.consumption.incomingRequests.accept({ requestId: manualDecisionRequiredRequest.id, items: acceptRequestItemsParameters });

        creationContent = RelationshipCreationContent.from({ response: acceptedRequest.value.response!.content }).toJSON();
    }

    const createRelationshipResponse = await runtimeServices2.transport.relationships.createRelationship({
        templateId: template.id,
        creationContent: creationContent ?? emptyRelationshipCreationContent
    });
    expect(createRelationshipResponse).toBeSuccessful();

    const relationships = await syncUntilHasRelationships(runtimeServices1.transport);
    expect(relationships).toHaveLength(1);

    const acceptResponse = await runtimeServices1.transport.relationships.acceptRelationship({
        relationshipId: relationships[0].id
    });
    expect(acceptResponse).toBeSuccessful();

    const relationships2 = await syncUntilHasRelationships(runtimeServices2.transport);
    expect(relationships2).toHaveLength(1);
}

export async function establishPendingRelationshipWithRequestFlow(
    sRuntimeServices: TestRuntimeServices,
    rRuntimeServices: TestRuntimeServices,
    requestItems: (RequestItemJSONDerivations | RequestItemGroupJSON)[],
    acceptParams: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[],
    requestOptions?: {
        title?: string;
        description?: string;
        expiresAt?: string;
        metadata?: object;
    }
): Promise<RelationshipDTO> {
    const templateContent: RelationshipTemplateContentJSON = {
        "@type": "RelationshipTemplateContent",
        onNewRelationship: {
            "@type": "Request",
            items: requestItems,
            title: requestOptions?.title,
            description: requestOptions?.description,
            expiresAt: requestOptions?.expiresAt,
            metadata: requestOptions?.metadata
        }
    };

    const template = await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, templateContent);

    await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.request.source!.reference === template.id);

    const requestId = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
    const result = await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: acceptParams });
    expect(result).toBeSuccessful();

    await rRuntimeServices.eventBus.waitForEvent(RelationshipChangedEvent);

    const sRelationship = (await syncUntilHasRelationships(sRuntimeServices.transport, 1))[0];
    expect(sRelationship.status).toStrictEqual(RelationshipStatus.Pending);

    await sRuntimeServices.eventBus.waitForRunningEventHandlers();

    return sRelationship;
}

export async function ensureActiveRelationship(sTransportServices: TransportServices, rTransportServices: TransportServices): Promise<RelationshipDTO> {
    const rTransportServicesAddress = (await rTransportServices.account.getIdentityInfo()).value.address;
    const sRelationships = (
        await sTransportServices.relationships.getRelationships({
            query: {
                peer: rTransportServicesAddress,
                status: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed]
            }
        })
    ).value;

    const sTransportServicesAddress = (await sTransportServices.account.getIdentityInfo()).value.address;
    const rRelationships = (
        await rTransportServices.relationships.getRelationships({
            query: {
                peer: sTransportServicesAddress,
                status: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed]
            }
        })
    ).value;

    if (sRelationships.length === 0 && rRelationships.length === 0) {
        await establishRelationship(sTransportServices, rTransportServices);
    } else if (sRelationships.length === 0 && rRelationships[0].status === RelationshipStatus.DeletionProposed) {
        const relationship = rRelationships[0];
        await rTransportServices.relationships.decomposeRelationship({ relationshipId: relationship.id });
        await establishRelationship(sTransportServices, rTransportServices);
    } else if (sRelationships[0].status === RelationshipStatus.Pending) {
        if (sRelationships[0].template.isOwn) {
            const relationship = sRelationships[0];
            await sTransportServices.relationships.acceptRelationship({ relationshipId: relationship.id });
            await syncUntilHasRelationships(rTransportServices, 1);
        } else {
            const relationship = rRelationships[0];
            await rTransportServices.relationships.acceptRelationship({ relationshipId: relationship.id });
            await syncUntilHasRelationships(sTransportServices, 1);
        }
    } else if (sRelationships[0].status === RelationshipStatus.Terminated) {
        const relationship = sRelationships[0];
        await sTransportServices.relationships.decomposeRelationship({ relationshipId: relationship.id });
        await syncUntilHasRelationships(rTransportServices, 1);
        await rTransportServices.relationships.decomposeRelationship({ relationshipId: relationship.id });
        await syncUntilHasRelationships(sTransportServices, 1);
        await establishRelationship(sTransportServices, rTransportServices);
    } else if (sRelationships[0].status === RelationshipStatus.DeletionProposed) {
        const relationship = sRelationships[0];
        await sTransportServices.relationships.decomposeRelationship({ relationshipId: relationship.id });
        await establishRelationship(sTransportServices, rTransportServices);
    }

    return (await sTransportServices.relationships.getRelationships({})).value[0];
}

export async function ensurePendingRelationship(sTransportServices: TransportServices, rTransportServices: TransportServices): Promise<RelationshipDTO> {
    const rTransportServicesAddress = (await rTransportServices.account.getIdentityInfo()).value.address;
    const relationships = (await sTransportServices.relationships.getRelationships({ query: { peer: rTransportServicesAddress } })).value;
    if (relationships.length === 0) {
        const template = await exchangeTemplate(sTransportServices, rTransportServices);

        const createRelationshipResponse = await rTransportServices.relationships.createRelationship({
            templateId: template.id,
            creationContent: emptyRelationshipCreationContent
        });
        expect(createRelationshipResponse).toBeSuccessful();

        const relationships = await syncUntilHasRelationships(sTransportServices);
        expect(relationships).toHaveLength(1);
    }

    return (await sTransportServices.relationships.getRelationships({})).value[0];
}

export async function reactivateTerminatedRelationship(sTransportServices: TransportServices, rTransportServices: TransportServices): Promise<void> {
    const rTransportServicesAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    const terminatedRelationshipsToPeer = (
        await sTransportServices.relationships.getRelationships({ query: { peer: rTransportServicesAddress, status: RelationshipStatus.Terminated } })
    ).value;

    if (terminatedRelationshipsToPeer.length !== 0) {
        const terminatedRelationshipId = terminatedRelationshipsToPeer[0].id;
        await rTransportServices.relationships.requestRelationshipReactivation({ relationshipId: terminatedRelationshipId });
        await syncUntilHasRelationships(sTransportServices);
        await sTransportServices.relationships.acceptRelationshipReactivation({ relationshipId: terminatedRelationshipId });
        await syncUntilHasRelationships(rTransportServices);
    }

    return;
}

export async function mutualDecomposeIfActiveRelationshipExists(sTransportServices: TransportServices, rTransportServices: TransportServices): Promise<void> {
    const rTransportServicesAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    const activeRelationshipsToPeer = (await sTransportServices.relationships.getRelationships({ query: { peer: rTransportServicesAddress, status: RelationshipStatus.Active } }))
        .value;

    if (activeRelationshipsToPeer.length !== 0) {
        const relationshipToPeer = activeRelationshipsToPeer[0];
        await sTransportServices.relationships.terminateRelationship({ relationshipId: relationshipToPeer.id });
        await syncUntilHasRelationships(rTransportServices, 1);
        await rTransportServices.relationships.decomposeRelationship({ relationshipId: relationshipToPeer.id });
        await syncUntilHasRelationships(sTransportServices, 1);
        await sTransportServices.relationships.decomposeRelationship({ relationshipId: relationshipToPeer.id });
    }

    return;
}

export async function exchangeAndAcceptRequestByMessage(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest,
    responseItems: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<MessageDTO> {
    const createRequestResult = await sender.consumption.outgoingRequests.create(request);
    expect(createRequestResult).toBeSuccessful();

    const requestId = createRequestResult.value.id;

    const senderMessage = await sender.transport.messages.sendMessage({
        recipients: [recipient.address],
        content: createRequestResult.value.content
    });

    await syncUntilHasMessageWithRequest(recipient.transport, requestId);
    await recipient.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
    await recipient.eventBus.waitForRunningEventHandlers();
    const acceptIncomingRequestResult = await recipient.consumption.incomingRequests.accept({ requestId: createRequestResult.value.id, items: responseItems });
    expect(acceptIncomingRequestResult).toBeSuccessful();
    await recipient.eventBus.waitForEvent(MessageSentEvent);
    await syncUntilHasMessageWithResponse(sender.transport, requestId);
    await sender.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed && e.data.request.id === requestId);
    return senderMessage.value;
}

export async function sendAndReceiveNotification(
    sTransportServices: TransportServices,
    rTransportServices: TransportServices,
    rConsumptionServices: ConsumptionServices,
    notificationItems: INotificationItem[] = [TestNotificationItem.from({})]
): Promise<LocalNotificationDTO> {
    const rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;
    const notificationId = await ConsumptionIds.notification.generate();

    const notificationToSend = Notification.from({ id: notificationId, items: notificationItems });
    await sTransportServices.messages.sendMessage({ recipients: [rAddress], content: notificationToSend.toJSON() });

    const message = await syncUntilHasMessageWithNotification(rTransportServices, notificationId);

    const notification = await rConsumptionServices.notifications.receivedNotification({ messageId: message.id });
    expect(notification).toBeSuccessful();

    return notification.value;
}

/**
 * Creates a repository attribute on sender's side and shares it with
 * recipient, waiting for all communication and event processing to finish.
 *
 * Returns the sender's own shared identity attribute.
 */
export async function executeFullCreateAndShareRepositoryAttributeFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateRepositoryAttributeRequest
): Promise<LocalAttributeDTO> {
    const createAttributeRequestResult = await sender.consumption.attributes.createRepositoryAttribute(request);
    const repositoryAttribute = createAttributeRequestResult.value;

    const senderOwnSharedIdentityAttribute = await executeFullShareRepositoryAttributeFlow(sender, recipient, repositoryAttribute.id);
    return senderOwnSharedIdentityAttribute;
}

export async function executeFullShareRepositoryAttributeFlow(sender: TestRuntimeServices, recipient: TestRuntimeServices, attributeId: string): Promise<LocalAttributeDTO> {
    const shareRequest: ShareRepositoryAttributeRequest = {
        attributeId: attributeId.toString(),
        peer: recipient.address
    };
    const shareRequestResult = await sender.consumption.attributes.shareRepositoryAttribute(shareRequest);
    const shareRequestId = shareRequestResult.value.id;

    const senderOwnSharedIdentityAttribute = await acceptIncomingShareAttributeRequest(sender, recipient, shareRequestId);
    return senderOwnSharedIdentityAttribute;
}

export async function acceptIncomingShareAttributeRequest(sender: TestRuntimeServices, recipient: TestRuntimeServices, requestId: string): Promise<LocalAttributeDTO> {
    await syncUntilHasMessageWithRequest(recipient.transport, requestId);
    await recipient.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
    });
    await recipient.consumption.incomingRequests.accept({ requestId: requestId, items: [{ accept: true }] });

    const responseMessage = await syncUntilHasMessageWithResponse(sender.transport, requestId);
    const sharedAttributeId = (responseMessage.content.response.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
    await sender.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.Completed;
    });

    const senderOwnSharedAttribute = (await sender.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
    return senderOwnSharedAttribute;
}

/**
 * Creates and shares a relationship attribute, waiting for all communication
 * and event processing to finish.
 *
 * Returns the sender's own shared relationship attribute.
 */
export async function executeFullCreateAndShareRelationshipAttributeFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: Omit<CreateAndShareRelationshipAttributeRequest, "peer">
): Promise<LocalAttributeDTO> {
    const requestResult = await sender.consumption.attributes.createAndShareRelationshipAttribute({ ...request, peer: recipient.address });
    const requestId = requestResult.value.id;

    const senderOwnSharedRelationshipAttribute = await acceptIncomingShareAttributeRequest(sender, recipient, requestId);
    return senderOwnSharedRelationshipAttribute;
}

/**
 * Succeeds a repository attribute on sender's side and notifies
 * recipient, waiting for all communication and event processing to finish.
 *
 * Returns the sender's own shared predecessor and successor identity attribute.
 */
export async function executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: SucceedRepositoryAttributeRequest
): Promise<SucceedRepositoryAttributeResponse> {
    const succeedAttributeRequestResult = await sender.consumption.attributes.succeedRepositoryAttribute(request);
    const repositorySuccessorId = succeedAttributeRequestResult.value.successor.id;

    const senderOwnSharedIdentityAttributes = await executeFullNotifyPeerAboutAttributeSuccessionFlow(sender, recipient, repositorySuccessorId);
    return senderOwnSharedIdentityAttributes;
}

export async function executeFullNotifyPeerAboutAttributeSuccessionFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    attributeId: string
): Promise<SucceedRepositoryAttributeResponse> {
    const notifyRequest: NotifyPeerAboutRepositoryAttributeSuccessionRequest = {
        attributeId: attributeId,
        peer: recipient.address
    };
    const notifyRequestResult = await sender.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession(notifyRequest);

    await waitForRecipientToReceiveNotification(sender, recipient, notifyRequestResult.value);

    const senderOwnSharedIdentityAttributes: SucceedRepositoryAttributeResponse = {
        predecessor: notifyRequestResult.value.predecessor,
        successor: notifyRequestResult.value.successor
    };

    return senderOwnSharedIdentityAttributes;
}

export async function waitForRecipientToReceiveNotification(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    notifyRequestResult: NotifyPeerAboutRepositoryAttributeSuccessionResponse
): Promise<void> {
    await syncUntilHasMessageWithNotification(recipient.transport, notifyRequestResult.notificationId);

    await sender.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
        return e.data.successor.id === notifyRequestResult.successor.id;
    });

    await recipient.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
        return e.data.successor.id === notifyRequestResult.successor.id;
    });
}

/**
 * The requestor asks the responder for a RepositoryAttribute or a RelationshipAttribute from another Relationship.
 * The responder sends them an own shared IdentityAttribute or ThirdPartyRelationshipAttribute,
 * waiting for all communication and event processing to finish.
 *
 * Returns the responder's own shared Attribute.
 */
export async function executeFullRequestAndAcceptExistingAttributeFlow(
    responder: TestRuntimeServices,
    requestor: TestRuntimeServices,
    request: CreateOutgoingRequestRequest,
    attributeId: string
): Promise<LocalAttributeDTO> {
    const localRequest = (await requestor.consumption.outgoingRequests.create(request)).value;
    await requestor.transport.messages.sendMessage({ recipients: [responder.address], content: localRequest.content });

    await syncUntilHasMessageWithRequest(responder.transport, localRequest.id);
    await responder.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === localRequest.id && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
    });
    await responder.consumption.incomingRequests.accept({
        requestId: localRequest.id,
        items: [{ accept: true, existingAttributeId: attributeId } as AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON]
    });

    const responseMessage = await syncUntilHasMessageWithResponse(requestor.transport, localRequest.id);
    const sharedAttributeId = (responseMessage.content.response.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
    await requestor.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === localRequest.id && e.data.newStatus === LocalRequestStatus.Completed;
    });

    const ownSharedAttribute = (await responder.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
    return ownSharedAttribute;
}

export async function executeFullShareAndAcceptAttributeRequestFlow(
    owner: TestRuntimeServices,
    peer: TestRuntimeServices,
    requestItem: ShareAttributeRequestItem
): Promise<LocalAttributeDTO> {
    const request = Request.from({
        items: [requestItem]
    });

    const canCreateResult = await owner.consumption.outgoingRequests.canCreate({
        content: request.toJSON(),
        peer: peer.address
    });

    expect(canCreateResult.value.isSuccess).toBe(true);

    const createRequestResult = await owner.consumption.outgoingRequests.create({
        content: request.toJSON(),
        peer: peer.address
    });

    await owner.transport.messages.sendMessage({
        recipients: [peer.address],
        content: createRequestResult.value.content
    });

    const ownSharedAttribute = await acceptIncomingShareAttributeRequest(owner, peer, createRequestResult.value.id);
    return ownSharedAttribute;
}

/**
 * Generate all possible combinations of the given arrays.
 *
 * combinations([1, 2], [a, b]) => [[1, a], [1, b], [2, a], [2, b]]
 *
 * Special Case: If only one array is given, it returns a list of lists with only the elements of the array
 *
 * combinations([1, 2]) => [[1], [2]]
 *
 * Strictly speaking this is not correct, since the combinations of an array with nothing should be nothing []
 * but in our case this makes more sense
 *
 * Beware: this contains recursion
 */
export function combinations<T>(...arrays: T[][]): T[][] {
    if (arrays.length < 1) {
        throw new Error("you must enter at least one array");
    }

    const firstArray = arrays[0];
    if (arrays.length === 1) {
        // Wrap every element in a list
        // This is neccessary because we want to return [[1], [2]] and not [[1, 2]] or [1, 2]
        return firstArray.map((x) => [x]);
    }

    const [firstArr, secondArr, ...allOtherArrs] = arrays;

    const result = [];
    // Combine the elements of the first array with all combinations of the other arrays
    for (const elem of firstArr) {
        for (const combination of combinations(secondArr, ...allOtherArrs)) {
            result.push([elem, ...combination]);
        }
    }
    return result;
}

export async function waitForEvent<TEvent>(
    eventBus: EventBus,
    subscriptionTarget: SubscriptionTarget<TEvent>,
    assertionFunction?: (t: TEvent) => boolean,
    timeout = 5000
): Promise<TEvent> {
    let subscriptionId: number;

    const eventPromise = new Promise<TEvent>((resolve) => {
        subscriptionId = eventBus.subscribe(subscriptionTarget, (event: TEvent) => {
            if (assertionFunction && !assertionFunction(event)) return;

            resolve(event);
        });
    });
    if (!timeout) return await eventPromise.finally(() => eventBus.unsubscribe(subscriptionId));

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<TEvent>((_resolve, reject) => {
        timeoutId = setTimeout(
            () => reject(new Error(`timeout exceeded for waiting for event ${typeof subscriptionTarget === "string" ? subscriptionTarget : subscriptionTarget.name}`)),
            timeout
        );
    });

    return await Promise.race([eventPromise, timeoutPromise]).finally(() => {
        eventBus.unsubscribe(subscriptionId);
        clearTimeout(timeoutId);
    });
}

export async function generateAddressPseudonym(backboneBaseUrl: string): Promise<CoreAddress> {
    const pseudoPublicKey = CoreBuffer.fromUtf8("deleted identity");
    const pseudonym = await IdentityUtil.createAddress({ algorithm: 1, publicKey: pseudoPublicKey }, new URL(backboneBaseUrl).hostname);

    return pseudonym;
}

export async function cleanupAttributes(services: TestRuntimeServices[], onlyShared = false): Promise<void> {
    const query = onlyShared ? { "shareInfo.sourceAttribute": "" } : {};
    await Promise.all(
        services.map(async (services) => {
            const servicesAttributeController = services.consumption.attributes["getAttributeUseCase"]["attributeController"];

            const servicesAttributesResult = await services.consumption.attributes.getAttributes({ query });
            for (const attribute of servicesAttributesResult.value) {
                await servicesAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
            }
        })
    );
}

export async function createRelationshipWithStatusPending(
    templator: TestRuntimeServices,
    requestor: TestRuntimeServices,
    templateContent: RelationshipTemplateContentJSON,
    acceptItems: DecideRequestParametersJSON["items"]
): Promise<RelationshipDTO> {
    const relationshipTemplateResult = await templator.transport.relationshipTemplates.createOwnRelationshipTemplate({
        content: templateContent,
        expiresAt: CoreDate.utc().add({ day: 1 }).toISOString()
    });

    const loadedPeerTemplateResult = await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({
        reference: relationshipTemplateResult.value.truncatedReference
    });

    await requestor.eventBus.waitForEvent(RelationshipTemplateProcessedEvent, (event) => {
        return event.data.template.id === loadedPeerTemplateResult.value.id;
    });

    const requestsForRelationship = await requestor.consumption.incomingRequests.getRequests({
        query: {
            "source.reference": loadedPeerTemplateResult.value.id
        }
    });

    await requestor.consumption.incomingRequests.accept({
        requestId: requestsForRelationship.value[0].id,
        items: acceptItems
    });

    const relationships = await syncUntilHasRelationships(templator.transport);
    expect(relationships).toHaveLength(1);
    return relationships[0];
}
