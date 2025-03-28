import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { RegisterAttributeListenerRequestItem, Request, ThirdPartyRelationshipAttributeQuery } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { Transport } from "@nmshd/transport";
import { ConsumptionController, ConsumptionIds, LocalRequest, LocalRequestStatus, RegisterAttributeListenerRequestItemProcessor } from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("CreateAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;

    let processor: RegisterAttributeListenerRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, connection, 1))[0];
        ({ consumptionController } = account);

        processor = new RegisterAttributeListenerRequestItemProcessor(consumptionController);
    });

    afterAll(async function () {
        await connection.close();
    });

    afterEach(async function () {
        const listeners = await consumptionController.attributeListeners.getAttributeListeners();

        for (const listener of listeners) {
            await consumptionController.attributeListeners["attributeListeners"].delete(listener);
        }
    });

    describe("accept", function () {
        test("creates an AttributeListener and persists it to the DB", async function () {
            const requestItem = RegisterAttributeListenerRequestItem.from({
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: "",
                    thirdParty: ["aThirdParty"]
                }),
                mustBeAccepted: true
            });

            const senderAddress = CoreAddress.from("SenderAddress");
            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: senderAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });

            const result = await processor.accept(
                requestItem,
                {
                    accept: true
                },
                incomingRequest
            );

            const listenerId = result.listenerId;

            const listener = await consumptionController.attributeListeners.getAttributeListener(CoreId.from(listenerId));

            expect(listener).toBeDefined();
        });
    });
});
