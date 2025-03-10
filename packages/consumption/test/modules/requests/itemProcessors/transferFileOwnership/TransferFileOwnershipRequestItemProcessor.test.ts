import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { Request, TransferFileOwnershipRequestItem } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { AccountController, FileReference, Transport } from "@nmshd/transport";
import { ConsumptionController, ConsumptionIds, LocalRequest, LocalRequestStatus, TransferFileOwnershipRequestItemProcessor } from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("TransferFileOwnershipRequestItemProcessor", function () {
    // TODO: check what is actually needed throughout this file
    let connection: IDatabaseConnection;
    let transport: Transport;

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
        transport = TestUtil.createTransport(connection);
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, 3);

        ({ accountController: senderAccountController, consumptionController: senderConsumptionController } = accounts[0]);
        sender = senderAccountController.identity.address;
        senderProcessor = new TransferFileOwnershipRequestItemProcessor(senderConsumptionController);

        ({ accountController: recipientAccountController, consumptionController: recipientConsumptionController } = accounts[1]);
        recipient = recipientAccountController.identity.address;
        recipientProcessor = new TransferFileOwnershipRequestItemProcessor(recipientConsumptionController);

        const thirdPartyAccountController = accounts[2].accountController;

        const senderFile = await TestUtil.uploadFile(senderAccountController);
        senderTrucatedFileReference = senderFile.truncate();

        const senderExpiredFile = await TestUtil.uploadFile(senderAccountController, { expiredAt: CoreDate.utc().add({ seconds: 1 }) });
        senderExpiredTrucatedFileReference = senderExpiredFile.truncate();
        await sleep(2000);

        const recipientFile = await TestUtil.uploadFile(recipientAccountController);
        recipientTrucatedFileReference = recipientFile.truncate();

        const thirdPartyFile = await TestUtil.uploadFile(thirdPartyAccountController);
        thirdPartyTrucatedFileReference = thirdPartyFile.truncate();
    });

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        test("returns success if the ownership of an own File should be transferred entering a truncatedFileReference", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderTrucatedFileReference
            });
            const json = requestItem.toJSON(); // TODO: delete after testing
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).successfulValidationResult();
        });

        test("returns success if the ownership of an own File should be transferred entering a FileReference", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: FileReference.from(senderTrucatedFileReference)
            });
            const json = requestItem.toJSON(); // TODO: delete after testing
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).successfulValidationResult();
        });

        test("returns error if the ownership of a File should be transferred that is not known by the sender", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: recipientTrucatedFileReference
            });
            const request = Request.from({ items: [requestItem] });

            const result = await senderProcessor.canCreateOutgoingRequestItem(requestItem, request, recipient);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`
            });
        });

        test("returns error if the ownership of a File should be transferred that is not owned by the sender", async function () {
            const thirdPartyFile = await senderAccountController.files.getOrLoadFileByTruncated(thirdPartyTrucatedFileReference);

            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: thirdPartyFile.truncate()
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
        test("returns success when checking if the transfer of ownership of a File can be accepted that is owned by the peer ", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderTrucatedFileReference,
                denyAttributeCopy: true
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).successfulValidationResult();
        });

        test("returns error when checking if the transfer of ownership of a File can be accepted that is expired", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: senderExpiredTrucatedFileReference,
                denyAttributeCopy: true
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The File with the given ID '${requestItem.fileReference.id.toString()}' could not be found.`
            });
        });

        test("returns error when checking if the transfer of ownership of a File can be accepted that is already owned by the recipient", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: recipientTrucatedFileReference,
                denyAttributeCopy: true
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The File with the given fileReference '${requestItem.fileReference.id.toString()}' is already owned by you.`
            });
        });

        test("returns error when checking if the transfer of ownership of a File can be accepted that is not owned by the sender", async function () {
            const requestItem = TransferFileOwnershipRequestItem.from({
                mustBeAccepted: false,
                fileReference: thirdPartyTrucatedFileReference,
                denyAttributeCopy: true
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });

            const result = await recipientProcessor.canAccept(requestItem, { accept: true }, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The File with the given fileReference '${requestItem.fileReference.id.toString()}' is not owned by the peer.`
            });
        });
    });

    // describe("accept", function () {
    //     test("returns success when accepting a shared IdentityAttribute", async function () {
    //         const requestItem = TransferFileOwnershipRequestItem.from({
    //             mustBeAccepted: false,
    //             fileReference: senderTrucatedFileReference,
    //             denyAttributeCopy: true
    //         });
    //         const incomingRequest = LocalRequest.from({
    //             id: await ConsumptionIds.request.generate(),
    //             createdAt: CoreDate.utc(),
    //             isOwn: false,
    //             peer: sender,
    //             status: LocalRequestStatus.DecisionRequired,
    //             content: Request.from({
    //                 items: [requestItem]
    //             }),
    //             statusLog: []
    //         });

    //         const responseItem = await processor.accept(requestItem, { accept: true }, incomingRequest);

    //         expect(responseItem).toBeInstanceOf(AcceptResponseItem);

    //         const createdAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);
    //         expect(createdAttribute).toBeDefined();
    //         expect(createdAttribute!.shareInfo).toBeDefined();
    //         expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(sender.toString());
    //         expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
    //         expect(createdAttribute!.content.owner.toString()).toStrictEqual(sender.toString());
    //     });
    // });

    // describe("applyIncomingResponseItem", function () {
    //     test("in case of an IdentityAttribute, creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the Request", async function () {
    //         const attributeOwner = accountController.identity.address.toString();

    //         const sourceAttributeContent = TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from(attributeOwner) });

    //         const sourceAttribute = await consumptionController.attributes.createAttributeUnsafe({
    //             content: sourceAttributeContent
    //         });

    //         const { localRequest, requestItem } = await createLocalRequest({ sourceAttribute });

    //         const responseItem = ShareAttributeAcceptResponseItem.from({
    //             result: ResponseItemResult.Accepted,
    //             attributeId: await ConsumptionIds.attribute.generate()
    //         });
    //         await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);
    //         const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
    //         expect(createdAttribute).toBeDefined();
    //         expect(createdAttribute!.id.toString()).toBe(responseItem.attributeId.toString());
    //         expect(createdAttribute!.shareInfo).toBeDefined();
    //         expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(localRequest.peer.toString());
    //         expect(createdAttribute!.shareInfo!.sourceAttribute?.toString()).toStrictEqual(sourceAttribute.id.toString());
    //         expect(createdAttribute!.content.owner.toString()).toStrictEqual(accountController.identity.address.toString());
    //     });

    //     test("in case of a RelationshipAttribute, creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the Request", async function () {
    //         const attributeOwner = accountController.identity.address.toString();

    //         const sourceAttributeContent = TestObjectFactory.createRelationshipAttribute({ owner: CoreAddress.from(attributeOwner) });

    //         const sourceAttribute = await consumptionController.attributes.createAttributeUnsafe({
    //             content: sourceAttributeContent,
    //             shareInfo: LocalAttributeShareInfo.from({
    //                 requestReference: CoreId.from("REQ1"),
    //                 peer: CoreAddress.from("thirdparty")
    //             })
    //         });

    //         const { localRequest, requestItem } = await createLocalRequest({ sourceAttribute });

    //         const responseItem = ShareAttributeAcceptResponseItem.from({
    //             result: ResponseItemResult.Accepted,
    //             attributeId: await ConsumptionIds.attribute.generate()
    //         });
    //         await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);
    //         const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
    //         expect(createdAttribute).toBeDefined();
    //         expect(createdAttribute!.id.toString()).toBe(responseItem.attributeId.toString());
    //         expect(createdAttribute!.shareInfo).toBeDefined();
    //         expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(localRequest.peer.toString());
    //         expect(createdAttribute!.shareInfo!.sourceAttribute?.toString()).toStrictEqual(sourceAttribute.id.toString());
    //         expect(createdAttribute!.content.owner.toString()).toStrictEqual(accountController.identity.address.toString());
    //         expect(createdAttribute!.shareInfo!.thirdPartyAddress?.toString()).toBe("thirdparty");
    //     });
    // });
});
