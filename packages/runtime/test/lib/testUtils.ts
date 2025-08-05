import { Event, EventBus, Result, sleep, SubscriptionTarget } from "@js-soft/ts-utils";
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptRequestItemParametersJSON,
    AttributeWithForwardedSharingInfos,
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
    ReadAttributeAcceptResponseItemJSON,
    RelationshipTemplateContentJSON,
    Request,
    RequestItemGroupJSON,
    RequestItemJSONDerivations,
    RequestJSON,
    ResponseWrapperJSON,
    ShareAttributeAcceptResponseItemJSON,
    ShareAttributeRequestItem
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, PasswordLocationIndicator } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { IdentityUtil } from "@nmshd/transport";
import fs from "fs";
import _ from "lodash";
import { DateTime } from "luxon";
import {
    ConsumptionServices,
    CreateAndShareRelationshipAttributeRequest,
    CreateOutgoingRequestRequest,
    CreateOwnIdentityAttributeRequest,
    FileDTO,
    IdentityDeletionProcessDTO,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    LocalNotificationDTO,
    LocalRequestStatus,
    MessageContentDerivation,
    MessageDTO,
    MessageSentEvent,
    NotifyPeerAboutOwnIdentityAttributeSuccessionRequest,
    NotifyPeerAboutOwnIdentityAttributeSuccessionResponse,
    OutgoingRequestStatusChangedEvent,
    PeerSharedAttributeSucceededEvent,
    RelationshipChangedEvent,
    RelationshipDTO,
    RelationshipStatus,
    RelationshipTemplateDTO,
    RelationshipTemplateProcessedEvent,
    ShareOwnIdentityAttributeRequest,
    SucceedOwnIdentityAttributeRequest,
    SucceedOwnIdentityAttributeResponse,
    SyncEverythingResponse,
    TokenDTO,
    TransportServices,
    UploadOwnFileRequest
} from "../../src";
import { TestRuntimeServices } from "./RuntimeServiceProvider";
import { TestNotificationItem } from "./TestNotificationItem";

export async function syncUntil(transportServices: TransportServices, until: (syncResult: SyncEverythingResponse) => boolean): Promise<SyncEverythingResponse> {
    const finalSyncResult: SyncEverythingResponse = { messages: [], relationships: [], identityDeletionProcesses: [], files: [] };

    let iterationNumber = 0;
    let criteriaMet: boolean;
    do {
        await sleep(iterationNumber * 25);

        const currentIterationSyncResult = (await transportServices.account.syncEverything()).value;

        finalSyncResult.messages.push(...currentIterationSyncResult.messages);
        finalSyncResult.relationships.push(...currentIterationSyncResult.relationships);
        finalSyncResult.identityDeletionProcesses.push(...currentIterationSyncResult.identityDeletionProcesses);
        finalSyncResult.files.push(...currentIterationSyncResult.files);

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

export async function syncUntilHasRelationship(transportServices: TransportServices, relationshipId: string | CoreId): Promise<RelationshipDTO> {
    return await syncUntilHas(transportServices, "relationships", (r) => r.id === relationshipId.toString());
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
    passwordProtection?: { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator }
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

// Override the default upload request with values
export async function makeUploadRequest(values: object = {}): Promise<UploadOwnFileRequest> {
    return {
        title: "aTitle",
        filename: "aFileName",
        content: await fs.promises.readFile(`${__dirname}/../__assets__/test.txt`),
        mimetype: "aMimetype",
        description: "aDescription",
        expiresAt: DateTime.utc().plus({ minutes: 5 }).toString(),
        ...values
    };
}

export const emptyRelationshipTemplateContent: ArbitraryRelationshipTemplateContentJSON = ArbitraryRelationshipTemplateContent.from({ value: {} }).toJSON();

export const emptyRelationshipCreationContent: ArbitraryRelationshipCreationContentJSON = ArbitraryRelationshipCreationContent.from({ value: {} }).toJSON();

export async function createTemplate(
    transportServices: TransportServices,
    body?: RelationshipTemplateContentJSON,
    passwordProtection?: { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator },
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

    const response = await transportServicesRecipient.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function exchangeFile(transportServicesCreator: TransportServices, transportServicesRecipient: TransportServices): Promise<FileDTO> {
    const fileToken = await getFileToken(transportServicesCreator);

    const response = await transportServicesRecipient.files.getOrLoadFile({ reference: fileToken.reference.truncated });
    expect(response).toBeSuccessful();

    return response.value;
}

export async function exchangeToken(transportServicesCreator: TransportServices, transportServicesRecipient: TransportServices): Promise<TokenDTO> {
    const token = await uploadOwnToken(transportServicesCreator);

    const response = await transportServicesRecipient.tokens.loadPeerToken({
        reference: token.reference.truncated,
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
    templateContent: RelationshipTemplateContentJSON,
    acceptRequestItemsParameters: (AcceptRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<void> {
    const template = await exchangeTemplate(runtimeServices1.transport, runtimeServices2.transport, templateContent);
    await runtimeServices2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.request.source!.reference === template.id);

    const requestId = (await runtimeServices2.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;

    const acceptRequestResult = await runtimeServices2.consumption.incomingRequests.accept({ requestId, items: acceptRequestItemsParameters });
    expect(acceptRequestResult).toBeSuccessful();

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
        const sRelationshipTemplate = await sTransportServices.relationshipTemplates.getRelationshipTemplate({ id: sRelationships[0].templateId });
        if (sRelationshipTemplate.value.isOwn) {
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

export async function executeFullCreateAndShareOwnIdentityAttributeFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOwnIdentityAttributeRequest
): Promise<LocalAttributeDTO> {
    const createAttributeRequestResult = await sender.consumption.attributes.createOwnIdentityAttribute(request);
    const ownIdentityAttribute = createAttributeRequestResult.value;

    const senderOwnIdentityAttribute = await executeFullShareOwnIdentityAttributeFlow(sender, recipient, ownIdentityAttribute.id);
    return senderOwnIdentityAttribute;
}

export async function executeFullShareOwnIdentityAttributeFlow(sender: TestRuntimeServices, recipient: TestRuntimeServices, attributeId: string): Promise<LocalAttributeDTO> {
    const shareRequest: ShareOwnIdentityAttributeRequest = {
        attributeId: attributeId.toString(),
        peer: recipient.address
    };
    const shareRequestResult = await sender.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
    const shareRequestId = shareRequestResult.value.id;

    const senderOwnIdentityAttribute = await acceptIncomingShareAttributeRequest(sender, recipient, shareRequestId);
    return senderOwnIdentityAttribute;
}

export async function acceptIncomingShareAttributeRequest(sender: TestRuntimeServices, recipient: TestRuntimeServices, requestId: string): Promise<LocalAttributeDTO> {
    await syncUntilHasMessageWithRequest(recipient.transport, requestId);
    await recipient.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === requestId && (e.data.newStatus === LocalRequestStatus.ManualDecisionRequired || e.data.newStatus === LocalRequestStatus.Decided);
    });
    await recipient.consumption.incomingRequests.accept({ requestId: requestId, items: [{ accept: true }] });

    const responseMessage = await syncUntilHasMessageWithResponse(sender.transport, requestId);
    // TODO: this will need to be refactored when we remove attributeId from ShareAttributeAcceptResponseItem
    const sharedAttributeId = (responseMessage.content.response.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
    await sender.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.Completed;
    });

    const senderOwnAttribute = (await sender.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
    return senderOwnAttribute;
}

export async function executeFullCreateAndShareRelationshipAttributeFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: Omit<CreateAndShareRelationshipAttributeRequest, "peer">
): Promise<LocalAttributeDTO> {
    const requestResult = await sender.consumption.attributes.createAndShareRelationshipAttribute({ ...request, peer: recipient.address });
    const requestId = requestResult.value.id;

    const senderOwnRelationshipAttribute = await acceptIncomingShareAttributeRequest(sender, recipient, requestId);
    return senderOwnRelationshipAttribute;
}

export async function executeFullSucceedOwnIdentityAttributeAndNotifyPeerFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: SucceedOwnIdentityAttributeRequest
): Promise<SucceedOwnIdentityAttributeResponse> {
    const succeedAttributeResult = await sender.consumption.attributes.succeedOwnIdentityAttribute(request);
    const ownIdentityAttributeSuccessorId = succeedAttributeResult.value.successor.id;

    const senderUpdatedOwnIdentityAttributes = await executeFullNotifyPeerAboutAttributeSuccessionFlow(sender, recipient, ownIdentityAttributeSuccessorId);
    return senderUpdatedOwnIdentityAttributes;
}

export async function executeFullNotifyPeerAboutAttributeSuccessionFlow(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    attributeId: string
): Promise<SucceedOwnIdentityAttributeResponse> {
    const notifyRequest: NotifyPeerAboutOwnIdentityAttributeSuccessionRequest = {
        attributeId: attributeId,
        peer: recipient.address
    };
    const notifyResult = await sender.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession(notifyRequest);

    await waitForRecipientToReceiveNotification(sender, recipient, notifyResult.value);

    const senderOwnIdentityAttributes: SucceedOwnIdentityAttributeResponse = {
        predecessor: notifyResult.value.predecessor,
        successor: notifyResult.value.successor
    };

    return senderOwnIdentityAttributes;
}

export async function waitForRecipientToReceiveNotification(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    notifyResult: NotifyPeerAboutOwnIdentityAttributeSuccessionResponse
): Promise<void> {
    await syncUntilHasMessageWithNotification(recipient.transport, notifyResult.notificationId);

    await recipient.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
        return e.data.successor.id === notifyResult.successor.id;
    });
}

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
    // TODO: this will need refactoring
    const sharedAttributeId = (responseMessage.content.response.items[0] as ReadAttributeAcceptResponseItemJSON).attributeId;
    await requestor.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === localRequest.id && e.data.newStatus === LocalRequestStatus.Completed;
    });

    const ownForwardedAttribute = (await responder.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
    return ownForwardedAttribute;
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

    const ownAttribute = await acceptIncomingShareAttributeRequest(owner, peer, createRequestResult.value.id);
    return ownAttribute;
}

// TODO: delete this
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

export async function cleanupAttributes(services: TestRuntimeServices[]): Promise<void> {
    await Promise.all(
        services.map(async (services) => {
            const servicesAttributeController = services.consumption.attributes["getAttributeUseCase"]["attributeController"];

            const servicesAttributesResult = await services.consumption.attributes.getAttributes({});
            for (const attribute of servicesAttributesResult.value) {
                await servicesAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
            }
        })
    );
}

export async function cleanupForwardedSharingInfos(services: TestRuntimeServices[]): Promise<void> {
    const query = { forwardedSharingInfos: "" };
    await Promise.all(
        services.map(async (services) => {
            const servicesAttributeController = services.consumption.attributes["getAttributeUseCase"]["attributeController"];

            const servicesAttributes = (await servicesAttributeController.getLocalAttributes({ query })) as AttributeWithForwardedSharingInfos[];
            for (const attribute of servicesAttributes) {
                attribute.forwardedSharingInfos = undefined;
                await servicesAttributeController.updateAttributeUnsafe(attribute);
            }
        })
    );
}

export async function cleanupFiles(services: TestRuntimeServices[]): Promise<void> {
    await Promise.all(
        services.map(async (services) => {
            const servicesFileController = services.transport.files["getFilesUseCase"]["fileController"];
            const files = await servicesFileController.getFiles({});
            for (const file of files) {
                await servicesFileController.deleteFile(file);
            }
        })
    );
}

export async function cleanupMessages(services: TestRuntimeServices[]): Promise<void> {
    await Promise.all(
        services.map(async (services) => {
            const servicesMessageController = services.transport.messages["getMessagesUseCase"]["messageController"];
            const messages = await servicesMessageController.getMessages({});
            for (const message of messages) {
                await servicesMessageController["messages"].delete(message);
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
        reference: relationshipTemplateResult.value.reference.truncated
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
