import { EventBus, Result, sleep, SubscriptionTarget } from "@js-soft/ts-utils";
import { ConsumptionIds, DecideRequestItemGroupParametersJSON, DecideRequestItemParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import {
    INotificationItem,
    IRelationshipCreationChangeRequestContent,
    IRelationshipTemplateContent,
    Notification,
    RelationshipCreationChangeRequestContent,
    RelationshipCreationChangeRequestContentJSON,
    RelationshipTemplateContent,
    RelationshipTemplateContentJSON
} from "@nmshd/content";
import { CoreId } from "@nmshd/transport";
import fs from "fs";
import { DateTime } from "luxon";
import {
    ConsumptionServices,
    CreateAndShareRelationshipAttributeRequest,
    CreateOutgoingRequestRequest,
    CreateRepositoryAttributeRequest,
    CreateTokenForFileRequest,
    CreateTokenQRCodeForFileRequest,
    FileDTO,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    LocalNotificationDTO,
    LocalRequestDTO,
    MessageDTO,
    MessageSentEvent,
    NotifyPeerAboutRepositoryAttributeSuccessionRequest,
    OutgoingRequestStatusChangedEvent,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RelationshipDTO,
    RelationshipStatus,
    RelationshipTemplateDTO,
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
    const finalSyncResult: SyncEverythingResponse = { messages: [], relationships: [] };

    let iterationNumber = 0;
    let criteriaMet: boolean;

    do {
        await sleep(50);

        const currentIterationSyncResult = (await transportServices.account.syncEverything()).value;

        finalSyncResult.messages.push(...currentIterationSyncResult.messages);
        finalSyncResult.relationships.push(...currentIterationSyncResult.relationships);

        iterationNumber++;
        criteriaMet = until(finalSyncResult);
    } while (!criteriaMet && iterationNumber <= 10);

    if (!criteriaMet) throw new Error("syncUntil: the criteria specified in syncUntil were not fulfilled");

    return finalSyncResult;
}

export async function syncUntilHasRelationships(transportServices: TransportServices, expectedNumberOfRelationships = 1): Promise<RelationshipDTO[]> {
    const syncResult = await syncUntil(transportServices, (syncResult) => syncResult.relationships.length >= expectedNumberOfRelationships);
    return syncResult.relationships;
}

export async function syncUntilHasMessages(transportServices: TransportServices, expectedNumberOfMessages = 1): Promise<MessageDTO[]> {
    const syncResult = await syncUntil(transportServices, (syncResult) => syncResult.messages.length >= expectedNumberOfMessages);
    return syncResult.messages;
}

export async function syncUntilHasMessageWithRequest(transportServices: TransportServices, requestId: string | CoreId): Promise<MessageDTO> {
    const filterRequestMessagesByRequestId = (syncResult: SyncEverythingResponse) => {
        return syncResult.messages.filter((m) => m.content["@type"] === "Request" && m.content.id === requestId.toString());
    };
    const syncResult = await syncUntil(transportServices, (syncResult) => filterRequestMessagesByRequestId(syncResult).length !== 0);
    return filterRequestMessagesByRequestId(syncResult)[0];
}

export async function syncUntilHasMessageWithResponse(transportServices: TransportServices, requestId: string | CoreId): Promise<MessageDTO> {
    const filterResponseMessagesByRequestId = (syncResult: SyncEverythingResponse) => {
        return syncResult.messages.filter((m) => m.content["@type"] === "ResponseWrapper" && m.content.requestId === requestId.toString());
    };
    const syncResult = await syncUntil(transportServices, (syncResult) => filterResponseMessagesByRequestId(syncResult).length !== 0);
    return filterResponseMessagesByRequestId(syncResult)[0];
}

export async function syncUntilHasMessageWithNotification(transportServices: TransportServices, notificationId: string | CoreId): Promise<MessageDTO> {
    const filterResponseMessagesByNotificationId = (syncResult: SyncEverythingResponse) => {
        return syncResult.messages.filter((m) => m.content["@type"] === "Notification" && m.content.id === notificationId.toString());
    };
    const syncResult = await syncUntil(transportServices, (syncResult) => filterResponseMessagesByNotificationId(syncResult).length !== 0);
    return filterResponseMessagesByNotificationId(syncResult)[0];
}

export async function uploadOwnToken(transportServices: TransportServices): Promise<TokenDTO> {
    const response = await transportServices.tokens.createOwnToken({
        content: {
            content: "Hello"
        },
        expiresAt: DateTime.utc().plus({ days: 1 }).toString(),
        ephemeral: false
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

export async function createTemplate(transportServices: TransportServices, body: RelationshipTemplateDTO | {} = {}): Promise<RelationshipTemplateDTO> {
    const response = await transportServices.relationshipTemplates.createOwnRelationshipTemplate({
        maxNumberOfAllocations: 1,
        expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
        content: body
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
    content: RelationshipTemplateContent | {} = {}
): Promise<RelationshipTemplateDTO> {
    const template = await createTemplate(transportServicesCreator, content);

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

export async function sendMessage(transportServices: TransportServices, recipient: string, content?: any, attachments?: string[]): Promise<MessageDTO> {
    const response = await transportServices.messages.sendMessage({
        recipients: [recipient],
        content: content ?? {
            "@type": "Mail",
            subject: "This is the mail subject",
            body: "This is the mail body",
            cc: [],
            to: [recipient]
        },
        attachments
    });
    expect(response).toBeSuccessful();

    return response.value;
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
    const template = await exchangeTemplate(transportServices1, transportServices2, {});

    const createRelationshipResponse = await transportServices2.relationships.createRelationship({
        templateId: template.id,
        content: { a: "b" }
    });
    expect(createRelationshipResponse).toBeSuccessful();

    const relationships = await syncUntilHasRelationships(transportServices1);
    expect(relationships).toHaveLength(1);

    const acceptResponse = await transportServices1.relationships.acceptRelationshipChange({
        relationshipId: relationships[0].id,
        changeId: relationships[0].changes[0].id,
        content: { a: "b" }
    });
    expect(acceptResponse).toBeSuccessful();

    const relationships2 = await syncUntilHasRelationships(transportServices2);
    expect(relationships2).toHaveLength(1);
    return relationships2[0];
}

export async function establishRelationshipWithContents(
    transportServices1: TransportServices,
    transportServices2: TransportServices,
    templateContent: RelationshipTemplateContentJSON | RelationshipTemplateContent | IRelationshipTemplateContent,
    requestContent: RelationshipCreationChangeRequestContentJSON | RelationshipCreationChangeRequestContent | IRelationshipCreationChangeRequestContent
): Promise<RelationshipDTO> {
    const template = await exchangeTemplate(transportServices1, transportServices2, templateContent);

    const createRelationshipResponse = await transportServices2.relationships.createRelationship({
        templateId: template.id,
        content: requestContent
    });
    expect(createRelationshipResponse).toBeSuccessful();

    const relationships = await syncUntilHasRelationships(transportServices1);
    expect(relationships).toHaveLength(1);

    const acceptResponse = await transportServices1.relationships.acceptRelationshipChange({
        relationshipId: relationships[0].id,
        changeId: relationships[0].changes[0].id,
        content: { a: "b" }
    });
    expect(acceptResponse).toBeSuccessful();

    const relationships2 = await syncUntilHasRelationships(transportServices2);
    expect(relationships2).toHaveLength(1);
    return relationships2[0];
}

export async function ensureActiveRelationship(sTransportServices: TransportServices, rTransportServices: TransportServices): Promise<RelationshipDTO> {
    const rTransportServicesAddress = (await rTransportServices.account.getIdentityInfo()).value.address;
    const relationships = (await sTransportServices.relationships.getRelationships({ query: { peer: rTransportServicesAddress } })).value;
    if (relationships.length === 0) {
        await establishRelationship(sTransportServices, rTransportServices);
    } else if (relationships[0].status === RelationshipStatus.Pending) {
        const relationship = relationships[0];
        await sTransportServices.relationships.acceptRelationshipChange({ relationshipId: relationship.id, changeId: relationship.changes[0].id, content: {} });
        await syncUntilHasRelationships(rTransportServices, 1);
    }

    return (await sTransportServices.relationships.getRelationships({})).value[0];
}

export interface RequestSourceReference {
    requestSourceReference: string;
}

export interface LocalRequestDTOWithRequestSource extends LocalRequestDTO {
    requestSourceReference: string;
}

export async function createRequest(sender: TestRuntimeServices, request: CreateOutgoingRequestRequest): Promise<Result<LocalRequestDTO>> {
    return await sender.consumption.outgoingRequests.create(request);
}

export async function createAndSendRequest(sender: TestRuntimeServices, recipient: TestRuntimeServices, request: CreateOutgoingRequestRequest): Promise<Result<MessageDTO>> {
    const localRequest = await createRequest(sender, request);
    return await sender.transport.messages.sendMessage({
        content: localRequest.value.content,
        recipients: [(await recipient.transport.account.getIdentityInfo()).value.address]
    });
}

export async function createSendAndMarkAsSentRequest(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest
): Promise<Result<LocalRequestDTO>> {
    const message = await createAndSendRequest(sender, recipient, request);
    return await sender.consumption.outgoingRequests.sent({ requestId: message.value.content.id, messageId: message.value.id });
}

export async function createSendAndSyncRequest(sender: TestRuntimeServices, recipient: TestRuntimeServices, request: CreateOutgoingRequestRequest): Promise<MessageDTO> {
    const localRequest = await createSendAndMarkAsSentRequest(sender, recipient, request);
    return await syncUntilHasMessageWithRequest(recipient.transport, localRequest.value.id);
}

export async function createSendAndReceiveRequest(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest
): Promise<Result<LocalRequestDTO> & RequestSourceReference> {
    const sentMessage = await createSendAndSyncRequest(sender, recipient, request);
    return Object.assign(await recipient.consumption.incomingRequests.received({ receivedRequest: sentMessage.content, requestSourceId: sentMessage.id }), {
        requestSourceReference: sentMessage.id
    });
}

export async function createSendSyncAndCheckRequest(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest
): Promise<Result<LocalRequestDTO> & RequestSourceReference> {
    const localRequest = await createSendAndReceiveRequest(sender, recipient, request);
    return Object.assign(
        await recipient.consumption.incomingRequests.checkPrerequisites({
            requestId: localRequest.value.id
        }),
        {
            requestSourceReference: localRequest.requestSourceReference
        }
    );
}

export async function createSendSyncRequestAndRequireManualDecision(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest
): Promise<Result<LocalRequestDTO>> {
    const localRequest = await createSendSyncAndCheckRequest(sender, recipient, request);
    return await recipient.consumption.incomingRequests.requireManualDecision({
        requestId: localRequest.value.id
    });
}

export async function createSendAndAcceptRequest(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest,
    responseItems: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<Result<LocalRequestDTO> & RequestSourceReference> {
    const localRequest = await createSendSyncAndCheckRequest(sender, recipient, request);
    return Object.assign(
        await recipient.consumption.incomingRequests.accept({
            requestId: localRequest.value.id,
            items: responseItems
        }),
        { requestSourceReference: localRequest.requestSourceReference }
    );
}

export async function createSendAndAcceptRequestAndSendResponse(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest,
    responseItems: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<Result<MessageDTO>> {
    const localRequest = await createSendAndAcceptRequest(sender, recipient, request, responseItems);
    return await recipient.transport.messages.sendMessage({
        content: {
            "@type": "ResponseWrapper",
            requestId: localRequest.value.id,
            requestSourceReference: localRequest.requestSourceReference,
            requestSourceType: "Message",
            response: localRequest.value.response!.content
        },
        recipients: [(await sender.transport.account.getIdentityInfo()).value.address]
    });
}

export async function createAndSendRequestSendResponseAndSync(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest,
    responseItems: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<MessageDTO> {
    const responseMessage = await createSendAndAcceptRequestAndSendResponse(sender, recipient, request, responseItems);
    return await syncUntilHasMessageWithResponse(sender.transport, responseMessage.value.content.requestId);
}

export async function sendRequestByMessage(sender: TestRuntimeServices, recipient: TestRuntimeServices, request: CreateOutgoingRequestRequest): Promise<void> {
    const createRequestResult = await sender.consumption.outgoingRequests.create(request);
    expect(createRequestResult).toBeSuccessful();

    await sender.transport.messages.sendMessage({
        recipients: [recipient.address],
        content: createRequestResult.value.content
    });

    await syncUntilHasMessages(recipient.transport);
}

export async function exchangeAndAcceptRequestByMessage(
    sender: TestRuntimeServices,
    recipient: TestRuntimeServices,
    request: CreateOutgoingRequestRequest,
    responseItems: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
): Promise<void> {
    const createRequestResult = await sender.consumption.outgoingRequests.create(request);
    expect(createRequestResult).toBeSuccessful();

    const requestId = createRequestResult.value.id;

    await sender.transport.messages.sendMessage({
        recipients: [recipient.address],
        content: createRequestResult.value.content
    });

    await syncUntilHasMessageWithRequest(recipient.transport, requestId);
    await recipient.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
    const acceptIncomingRequestResult = await recipient.consumption.incomingRequests.accept({ requestId: createRequestResult.value.id, items: responseItems });
    expect(acceptIncomingRequestResult).toBeSuccessful();
    await recipient.eventBus.waitForEvent(MessageSentEvent);
    await syncUntilHasMessageWithResponse(sender.transport, requestId);
    await sender.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
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

    await syncUntilHasMessageWithRequest(recipient.transport, requestId);
    await recipient.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
    });
    await recipient.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

    const responseMessage = await syncUntilHasMessageWithResponse(sender.transport, requestId);
    const sharedAttributeId = responseMessage.content.response.items[0].attributeId;
    await sender.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.Completed;
    });

    const senderOwnSharedRelationshipAttribute = (await sender.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
    return senderOwnSharedRelationshipAttribute;
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
    const attribute = createAttributeRequestResult.value;

    const shareRequest: ShareRepositoryAttributeRequest = {
        attributeId: attribute.id,
        peer: recipient.address
    };
    const shareRequestResult = await sender.consumption.attributes.shareRepositoryAttribute(shareRequest);
    const shareRequestId = shareRequestResult.value.id;

    await syncUntilHasMessageWithRequest(recipient.transport, shareRequestId);
    await recipient.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
    });
    await recipient.consumption.incomingRequests.accept({ requestId: shareRequestId, items: [{ accept: true }] });

    const responseMessage = await syncUntilHasMessageWithResponse(sender.transport, shareRequestId);
    const sharedAttributeId = responseMessage.content.response.items[0].attributeId;
    await sender.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
        return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.Completed;
    });

    const senderOwnSharedIdentityAttribute = (await sender.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
    return senderOwnSharedIdentityAttribute;
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
    const repositorySuccessor = succeedAttributeRequestResult.value.successor;

    const notifyRequest: NotifyPeerAboutRepositoryAttributeSuccessionRequest = {
        attributeId: repositorySuccessor.id,
        peer: recipient.address
    };
    const notifyRequestResult = await sender.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession(notifyRequest);
    const notificationId = notifyRequestResult.value.notificationId;

    await syncUntilHasMessageWithNotification(recipient.transport, notificationId);

    await sender.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
        return e.data.successor.id === notifyRequestResult.value.successor.id;
    });

    await recipient.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
        return e.data.successor.id === notifyRequestResult.value.successor.id;
    });

    const senderOwnSharedIdentityAttributes: SucceedRepositoryAttributeResponse = {
        predecessor: notifyRequestResult.value.predecessor,
        successor: notifyRequestResult.value.successor
    };

    return senderOwnSharedIdentityAttributes;
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
