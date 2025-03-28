import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { Request } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { ConsumptionController } from "../../../src";
import { TestUtil } from "../../core/TestUtil";
import { TestRequestItem } from "./testHelpers/TestRequestItem";
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor";

let connection: IDatabaseConnection;
let transport: Transport;

describe("Delete requests", function () {
    let sAccountController: AccountController;
    let sConsumptionController: ConsumptionController;
    let rAccountController: AccountController;
    let rConsumptionController: ConsumptionController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);

        ({ accountController: sAccountController, consumptionController: sConsumptionController } = accounts[0]);
        sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);
        ({ accountController: rAccountController, consumptionController: rConsumptionController } = accounts[1]);
        rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);
    });

    beforeEach(async function () {
        await TestUtil.ensureActiveRelationship(sAccountController, rAccountController);
    });

    afterAll(async function () {
        await connection.close();
    });

    test("requests should be deleted after decomposing", async function () {
        const sLocalRequest = await sConsumptionController.outgoingRequests.create({
            content: Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] }),
            peer: rAccountController.identity.address
        });

        await sAccountController.messages.sendMessage({ content: sLocalRequest.content, recipients: [rAccountController.identity.address] });
        const messages = await TestUtil.syncUntilHasMessages(rAccountController);
        const rMessageWithRequest = messages[0];
        const rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: rMessageWithRequest.cache!.content as Request,
            requestSourceObject: rMessageWithRequest
        });

        await TestUtil.terminateRelationship(sAccountController, rAccountController);
        await TestUtil.decomposeRelationship(sAccountController, sConsumptionController, rAccountController);
        await TestUtil.decomposeRelationship(rAccountController, rConsumptionController, sAccountController);
        const sRequest = await sConsumptionController.outgoingRequests.getOutgoingRequest(sLocalRequest.id);
        const rRequest = await sConsumptionController.incomingRequests.getIncomingRequest(rLocalRequest.id);
        expect(sRequest).toBeUndefined();
        expect(rRequest).toBeUndefined();
    });

    test("should be possible to delete an expired request", async function () {
        const sLocalRequest = await sConsumptionController.outgoingRequests.create({
            content: Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })], expiresAt: CoreDate.utc().add({ seconds: 3 }) }),
            peer: rAccountController.identity.address
        });

        await sAccountController.messages.sendMessage({ content: sLocalRequest.content, recipients: [rAccountController.identity.address] });
        const messages = await TestUtil.syncUntilHasMessages(rAccountController);
        const rMessageWithRequest = messages[0];
        const rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: rMessageWithRequest.cache!.content as Request,
            requestSourceObject: rMessageWithRequest
        });

        await sleep(3000);

        const requestInDeletion = await rConsumptionController.incomingRequests.getIncomingRequest(rLocalRequest.id);
        await rConsumptionController.incomingRequests.delete(requestInDeletion!);

        const rRequestAfterDeletion = await rConsumptionController.incomingRequests.getIncomingRequest(sLocalRequest.id);
        expect(rRequestAfterDeletion).toBeUndefined();
    });

    test("should not be possible to delete a non expired request", async function () {
        const sLocalRequest = await sConsumptionController.outgoingRequests.create({
            content: Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] }),
            peer: rAccountController.identity.address
        });

        await sAccountController.messages.sendMessage({ content: sLocalRequest.content, recipients: [rAccountController.identity.address] });
        const messages = await TestUtil.syncUntilHasMessages(rAccountController);
        const rMessageWithRequest = messages[0];
        const rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: rMessageWithRequest.cache!.content as Request,
            requestSourceObject: rMessageWithRequest
        });

        await expect(rConsumptionController.incomingRequests.delete(rLocalRequest)).rejects.toThrow("error.consumption.requests.canOnlyDeleteIncomingRequestThatIsExpired");
    });
});
