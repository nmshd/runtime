import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Request } from "@nmshd/content";
import { AccountController, Message, Transport } from "@nmshd/transport";
import { ConsumptionController, LocalRequest } from "../../../src";
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

    let sLocalRequest: LocalRequest;
    let rMessageWithRequest: Message;
    let rLocalRequest: LocalRequest;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);

        ({ accountController: sAccountController, consumptionController: sConsumptionController } = accounts[0]);
        sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);
        ({ accountController: rAccountController, consumptionController: rConsumptionController } = accounts[1]);
        rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);

        await TestUtil.addRelationship(sAccountController, rAccountController);
        sLocalRequest = await sConsumptionController.outgoingRequests.create({
            content: Request.from({
                items: [TestRequestItem.from({ mustBeAccepted: false })]
            }),
            peer: rAccountController.identity.address
        });

        await sAccountController.messages.sendMessage({
            content: sLocalRequest.content,
            recipients: [rAccountController.identity.address]
        });
        const messages = await TestUtil.syncUntilHasMessages(rAccountController);
        rMessageWithRequest = messages[0];
        rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: rMessageWithRequest.cache!.content as Request,
            requestSourceObject: rMessageWithRequest
        });
    });

    afterAll(async function () {
        await connection.close();
    });

    test("requests should be deleted after decomposing", async function () {
        await TestUtil.terminateRelationship(sAccountController, rAccountController);
        await TestUtil.decomposeRelationship(sAccountController, sConsumptionController, rAccountController);
        await TestUtil.decomposeRelationship(rAccountController, rConsumptionController, sAccountController);
        const sRequest = await sConsumptionController.outgoingRequests.getOutgoingRequest(sLocalRequest.id);
        const rRequest = await sConsumptionController.incomingRequests.getIncomingRequestWithUpdatedExpiry(rLocalRequest.id);
        expect(sRequest).toBeUndefined();
        expect(rRequest).toBeUndefined();
    });
});
