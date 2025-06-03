import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { IdentityAttribute, IdentityFileReference, Request, ResponseItemResult, TransferFileOwnershipAcceptResponseItem, TransferFileOwnershipRequestItem } from "@nmshd/content";
import { CoreAddress, CoreDate, FileReference } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { ConsumptionController, ConsumptionIds, LocalRequest, LocalRequestStatus, TransferFileOwnershipRequestItemProcessor } from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("TransferFileOwnershipRequestItemProcessor", function () {
    let connection: IDatabaseConnection;

    let sender: CoreAddress;
    let senderAccountController: AccountController;
    let senderConsumptionController: ConsumptionController;
    let senderProcessor: TransferFileOwnershipRequestItemProcessor;

    let recipient: CoreAddress;
    let recipientAccountController: AccountController;
    let recipientConsumptionController: ConsumptionController;
    let recipientProcessor: TransferFileOwnershipRequestItemProcessor;

    let senderTrucatedFileReference: string;
    let senderExpiredTrucatedFileReference: string;
    let recipientTrucatedFileReference: string;
    let thirdPartyTrucatedFileReference: string;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        const transport = TestUtil.createTransport();
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, connection, 3);

        ({ accountController: senderAccountController, consumptionController: senderConsumptionController } = accounts[0]);
        sender = senderAccountController.identity.address;
        senderProcessor = new TransferFileOwnershipRequestItemProcessor(senderConsumptionController);

        ({ accountController: recipientAccountController, consumptionController: recipientConsumptionController } = accounts[1]);
        recipient = recipientAccountController.identity.address;
        recipientProcessor = new TransferFileOwnershipRequestItemProcessor(recipientConsumptionController);

        const thirdPartyAccountController = accounts[2].accountController;

        const senderFile = await TestUtil.uploadFile(senderAccountController, { tags: ["x+%+tag"] });
        senderTrucatedFileReference = senderFile.toFileReference(senderAccountController.config.baseUrl).truncate();

        const senderExpiredFile = await TestUtil.uploadFile(senderAccountController, { expiresAt: CoreDate.utc().add({ seconds: 1 }) });
        senderExpiredTrucatedFileReference = senderExpiredFile.toFileReference(senderAccountController.config.baseUrl).truncate();
        await sleep(2000);

        const recipientFile = await TestUtil.uploadFile(recipientAccountController, { tags: ["x+%+tag"] });
        recipientTrucatedFileReference = recipientFile.toFileReference(recipientAccountController.config.baseUrl).truncate();

        const thirdPartyFile = await TestUtil.uploadFile(thirdPartyAccountController);
        thirdPartyTrucatedFileReference = thirdPartyFile.toFileReference(thirdPartyAccountController.config.baseUrl).truncate();
    });

    beforeEach(async () => {
        await TestUtil.cleanupAttributes(senderConsumptionController);
        await TestUtil.cleanupAttributes(recipientConsumptionController);
    });

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        test("returns success if the ownership of an own File should be transferred entering a truncatedFileReference", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderTrucatedFileReference
            });
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).successfulValidationResult();
        });

        test("returns success if the ownership of an own File should be transferred entering a FileReference", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: FileReference.from(senderTrucatedFileReference)
            });
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).successfulValidationResult();
        });

        test("returns error if the ownership of a File should be transferred that is not known by the sender", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: thirdPartyTrucatedFileReference
            });
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`
            });
        });

        test("returns error if the ownership of a File should be transferred that is not owned by the sender", async function () {
            const thirdPartyFile = await senderAccountController.files.getOrLoadFileByReference(FileReference.from(thirdPartyTrucatedFileReference));

            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: thirdPartyFile.toFileReference(senderAccountController.config.baseUrl).truncate()
            });
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `You cannot request the transfer of ownership of the File with ID '${requestItem.fileReference.id.toString()}' since it is not owned by you.`
            });
        });

        test("returns error if the ownership of a File should be transferred that is expired", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderExpiredTrucatedFileReference
            });
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `You cannot request the transfer of ownership of the File with ID '${requestItem.fileReference.id.toString()}' since it is already expired.`
            });
        });
    });

    describe("canAccept", function () {
        test("returns success when checking if the transfer of ownership of a File can be accepted that is owned by the sender", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderTrucatedFileReference
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).successfulValidationResult();
        });

        test("returns error when checking if the transfer of ownership of a File can be accepted that is expired", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderExpiredTrucatedFileReference
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `You cannot accept this RequestItem since the File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`
            });
        });

        test("returns error when checking if the transfer of ownership of a File can be accepted that is already owned by the recipient", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: recipientTrucatedFileReference
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' is already owned by you.`
            });
        });

        test("returns error when checking if the transfer of ownership of a File can be accepted that is not owned by the sender", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: thirdPartyTrucatedFileReference
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `You cannot accept this RequestItem since the File with the given fileReference '${requestItem.fileReference.id.toString()}' is not owned by the peer.`
            });
        });
    });

    describe("accept", function () {
        test("creates a RepositoryAttribute with tags and an own shared IdentityAttribute and responds with a TransferFileOwnershipAcceptResponseItem if the sender requests an Attribute copy", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderTrucatedFileReference
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const responseItem = await recipientProcessor.accept(requestItem, { accept: true }, incomingRequest);
            expect(responseItem).toBeInstanceOf(TransferFileOwnershipAcceptResponseItem);

            const ownSharedIdentityAttribute = await recipientConsumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            expect(ownSharedIdentityAttribute!.shareInfo!.peer).toStrictEqual(sender);
            expect(ownSharedIdentityAttribute!.shareInfo!.requestReference).toStrictEqual(incomingRequest.id);
            expect(ownSharedIdentityAttribute!.content.value).toBeInstanceOf(IdentityFileReference);
            expect((ownSharedIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag"]);

            const repositoryAttribute = await recipientConsumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
            expect(repositoryAttribute!.shareInfo).toBeUndefined();
            expect(repositoryAttribute!.content.value).toBeInstanceOf(IdentityFileReference);
            expect((repositoryAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag"]);

            const fileReference = FileReference.from((repositoryAttribute!.content.value as IdentityFileReference).value);
            const file = await recipientAccountController.files.getFile(fileReference.id);
            expect(file!.isOwn).toBe(true);
            expect(file!.cache!.tags).toStrictEqual(["x+%+tag"]);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("creates peer shared IdentityAttribute in case of a TransferFileOwnershipAcceptResponseItem", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderTrucatedFileReference
            });

            const requestInfo = {
                id: await ConsumptionIds.request.generate(),
                peer: recipient
            };

            const responseItem = TransferFileOwnershipAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: await ConsumptionIds.attribute.generate(),
                attribute: IdentityAttribute.from({
                    value: IdentityFileReference.from({
                        value: recipientTrucatedFileReference
                    }),
                    owner: recipient,
                    tags: ["x+%+tag"]
                })
            });

            await senderProcessor.applyIncomingResponseItem(responseItem, requestItem, requestInfo);

            const peerSharedIdentityAttribute = await senderConsumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            expect(peerSharedIdentityAttribute!.shareInfo!.peer).toStrictEqual(recipient);
            expect(peerSharedIdentityAttribute!.shareInfo!.requestReference).toStrictEqual(requestInfo.id);
            expect(peerSharedIdentityAttribute!.shareInfo!.sourceAttribute).toBeUndefined();

            const truncatedFileReference = (peerSharedIdentityAttribute!.content.value as IdentityFileReference).value;
            const file = await senderAccountController.files.getOrLoadFileByReference(FileReference.from(truncatedFileReference));
            expect(file.isOwn).toBe(false);
            expect(file.cache!.tags).toStrictEqual(["x+%+tag"]);
        });
    });
});
