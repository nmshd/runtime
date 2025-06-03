/* eslint-disable jest/expect-expect */
import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AcceptResponseItem, RelationshipCreationContent, RelationshipTemplateContent, Request, Response, ResponseWrapper } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Message, Relationship, RelationshipTemplate, Transport } from "@nmshd/transport";
import { ConsumptionController, LocalRequest, LocalRequestStatus } from "../../../src";
import { TestUtil } from "../../core/TestUtil";
import { TestRequestItem } from "./testHelpers/TestRequestItem";
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor";

let connection: IDatabaseConnection;
let transport: Transport;

describe("End2End Request/Response via Relationship Template", function () {
    let sAccountController: AccountController;
    let sConsumptionController: ConsumptionController;
    let rAccountController: AccountController;
    let rConsumptionController: ConsumptionController;

    let sTemplate: RelationshipTemplate;
    let rTemplate: RelationshipTemplate;
    let rLocalRequest: LocalRequest;
    let rRelationship: Relationship;
    let sRelationship: Relationship;
    let sLocalRequest: LocalRequest;

    let sCreationContent: RelationshipCreationContent;
    let rCreationContent: RelationshipCreationContent;

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

    afterAll(async function () {
        await connection.close();
    });

    test("sender: create a Relationship Template with the Request", async function () {
        const request = Request.from({
            items: [TestRequestItem.from({ mustBeAccepted: false })]
        });
        sTemplate = await sAccountController.relationshipTemplates.sendRelationshipTemplate({
            content: RelationshipTemplateContent.from({ onNewRelationship: request }),
            expiresAt: CoreDate.utc().add({ hours: 1 }),
            maxNumberOfAllocations: 1
        });
    });

    test("recipient: load Relationship Template", async function () {
        const reference = sTemplate.toRelationshipTemplateReference(sAccountController.config.baseUrl);
        rTemplate = await rAccountController.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);
    });

    test("recipient: create Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: (rTemplate.cache!.content as RelationshipTemplateContent).onNewRelationship,
            requestSourceObject: rTemplate
        });
    });

    test("recipient: check prerequisites of Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
            requestId: rLocalRequest.id
        });
    });

    test("recipient: require manual decision of Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.requireManualDecision({
            requestId: rLocalRequest.id
        });
    });

    test("recipient: accept Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.accept({
            requestId: rLocalRequest.id.toString(),
            items: [
                {
                    accept: true
                }
            ]
        });
    });

    test("recipient: create Relationship with Response in Relationship Creation Content", async function () {
        rRelationship = await rAccountController.relationships.sendRelationship({
            template: rTemplate,
            creationContent: RelationshipCreationContent.from({ response: rLocalRequest.response!.content })
        });
        rCreationContent = rRelationship.cache?.creationContent as RelationshipCreationContent;
    });

    test("recipient: complete Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.complete({
            requestId: rLocalRequest.id,
            responseSourceObject: rRelationship
        });
    });

    test("sender: syncEverything to get Relationship Change with Response", async function () {
        const newRelationships = await TestUtil.syncUntilHasRelationships(sAccountController);
        sRelationship = newRelationships[0];
    });

    test("sender: create Local Request and Response from Relationship Change", async function () {
        sCreationContent = sRelationship.cache!.creationContent as RelationshipCreationContent;
        const response = sCreationContent.response;

        sLocalRequest = await sConsumptionController.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
            template: sTemplate,
            responseSource: sRelationship,
            response
        });
    });

    test("expectations", function () {
        // in the end, both Local Requests should be completed
        expect(rLocalRequest.status).toStrictEqual(LocalRequestStatus.Completed);
        expect(sLocalRequest.status).toStrictEqual(LocalRequestStatus.Completed);

        // the ids of the Local Requests should be equal
        expect(rLocalRequest.id.toString()).toStrictEqual(sLocalRequest.id.toString());

        // make sure (de-)serialization worked as expected
        expect(sTemplate.cache!.content).toBeInstanceOf(RelationshipTemplateContent);
        expect((sTemplate.cache!.content as RelationshipTemplateContent).onNewRelationship).toBeInstanceOf(Request);

        expect(rTemplate.cache!.content).toBeInstanceOf(RelationshipTemplateContent);
        expect((rTemplate.cache!.content as RelationshipTemplateContent).onNewRelationship).toBeInstanceOf(Request);

        expect(sLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(rLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);

        expect(sCreationContent.response).toBeInstanceOf(Response);
        expect(rCreationContent.response).toBeInstanceOf(Response);

        expect(sLocalRequest.response!.content.items[0]).toBeInstanceOf(AcceptResponseItem);
        expect(rLocalRequest.response!.content.items[0]).toBeInstanceOf(AcceptResponseItem);
    });
});

describe("End2End Request/Response via Messages", function () {
    let sAccountController: AccountController;
    let sConsumptionController: ConsumptionController;
    let rAccountController: AccountController;
    let rConsumptionController: ConsumptionController;

    let sLocalRequest: LocalRequest;
    let sMessageWithRequest: Message;
    let rMessageWithRequest: Message;
    let rLocalRequest: LocalRequest;
    let rMessageWithResponse: Message;
    let sMessageWithResponse: Message;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);

        ({ accountController: sAccountController, consumptionController: sConsumptionController } = accounts[0]);
        sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);
        ({ accountController: rAccountController, consumptionController: rConsumptionController } = accounts[1]);
        rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);

        await TestUtil.addRelationship(sAccountController, rAccountController);
    });

    afterAll(async function () {
        await connection.close();
    });

    test("sender: create Local Request", async function () {
        sLocalRequest = await sConsumptionController.outgoingRequests.create({
            content: Request.from({
                items: [TestRequestItem.from({ mustBeAccepted: false })]
            }),
            peer: rAccountController.identity.address
        });
    });

    test("sender: send Message with Request", async function () {
        sMessageWithRequest = await sAccountController.messages.sendMessage({
            content: sLocalRequest.content,
            recipients: [rAccountController.identity.address]
        });
    });

    test("sender: mark Local Request as sent", async function () {
        sLocalRequest = await sConsumptionController.outgoingRequests.sent({
            requestId: sLocalRequest.id,
            requestSourceObject: sMessageWithRequest
        });
    });

    test("recipient: syncEverything to get Message with Request", async function () {
        const messages = await TestUtil.syncUntilHasMessages(rAccountController);
        rMessageWithRequest = messages[0];
    });

    test("recipient: create Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: rMessageWithRequest.cache!.content as Request,
            requestSourceObject: rMessageWithRequest
        });
    });

    test("recipient: check prerequisites of Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
            requestId: rLocalRequest.id
        });
    });

    test("recipient: require manual decision of Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.requireManualDecision({
            requestId: rLocalRequest.id
        });
    });

    test("recipient: accept Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.accept({
            requestId: rLocalRequest.id.toString(),
            items: [
                {
                    accept: true
                }
            ]
        });
    });

    test("recipient: send Message with Response", async function () {
        rMessageWithResponse = await rAccountController.messages.sendMessage({
            content: ResponseWrapper.from({
                response: rLocalRequest.response!.content,
                requestId: rLocalRequest.id,
                requestSourceType: "Message",
                requestSourceReference: rMessageWithRequest.id
            }),
            recipients: [sAccountController.identity.address]
        });
    });

    test("recipient: complete Local Request", async function () {
        const responseWrapper = rMessageWithResponse.cache!.content as ResponseWrapper;
        expect(responseWrapper).toBeInstanceOf(ResponseWrapper);

        const message = await rAccountController.messages.getMessage(responseWrapper.requestSourceReference);
        expect(message).toBeDefined();

        rLocalRequest = await rConsumptionController.incomingRequests.complete({
            requestId: responseWrapper.requestId,
            responseSourceObject: message
        });
    });

    test("sender: syncEverything to get Message with Response", async function () {
        const messages = await TestUtil.syncUntilHasMessages(sAccountController);
        sMessageWithResponse = messages[0];
    });

    test("sender: complete Local Request", async function () {
        const responseWrapper = sMessageWithResponse.cache!.content as ResponseWrapper;

        sLocalRequest = await sConsumptionController.outgoingRequests.complete({
            requestId: responseWrapper.requestId,
            responseSourceObject: sMessageWithResponse,
            receivedResponse: responseWrapper.response
        });
    });

    test("expectations", function () {
        // in the end, both Local Requests should be completed
        expect(rLocalRequest.status).toStrictEqual(LocalRequestStatus.Completed);
        expect(sLocalRequest.status).toStrictEqual(LocalRequestStatus.Completed);

        // the ids of the Local Requests should be equal
        expect(rLocalRequest.id.toString()).toStrictEqual(sLocalRequest.id.toString());

        // make sure (de-)serialization worked as expected
        expect(sMessageWithRequest.cache!.content).toBeInstanceOf(Request);
        expect(rMessageWithRequest.cache!.content).toBeInstanceOf(Request);
        expect(sLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(rLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(sMessageWithResponse.cache!.content).toBeInstanceOf(ResponseWrapper);
        expect(rMessageWithResponse.cache!.content).toBeInstanceOf(ResponseWrapper);
        expect(sLocalRequest.response!.content.items[0]).toBeInstanceOf(AcceptResponseItem);
        expect(rLocalRequest.response!.content.items[0]).toBeInstanceOf(AcceptResponseItem);
    });
});

describe("End2End Request via Template and Response via Message", function () {
    let sAccountController: AccountController;
    let sConsumptionController: ConsumptionController;
    let rAccountController: AccountController;
    let rConsumptionController: ConsumptionController;

    let sLocalRequest: LocalRequest;
    let rLocalRequest: LocalRequest;
    let rMessageWithResponse: Message;
    let sMessageWithResponse: Message;
    let sTemplate: RelationshipTemplate;
    let rTemplate: RelationshipTemplate;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);

        ({ accountController: sAccountController, consumptionController: sConsumptionController } = accounts[0]);
        sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);
        ({ accountController: rAccountController, consumptionController: rConsumptionController } = accounts[1]);
        rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(TestRequestItem, TestRequestItemProcessor);

        await TestUtil.addRelationship(sAccountController, rAccountController);
    });

    afterAll(async function () {
        await connection.close();
    });

    test("sender: create a Relationship Template with the Request", async function () {
        const request = Request.from({
            items: [TestRequestItem.from({ mustBeAccepted: false })]
        });
        sTemplate = await sAccountController.relationshipTemplates.sendRelationshipTemplate({
            content: RelationshipTemplateContent.from({
                onNewRelationship: request,
                onExistingRelationship: request
            }),
            expiresAt: CoreDate.utc().add({ hours: 1 }),
            maxNumberOfAllocations: 1
        });
    });

    test("recipient: load Relationship Template", async function () {
        const reference = sTemplate.toRelationshipTemplateReference(sAccountController.config.baseUrl);
        rTemplate = await rAccountController.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);
    });

    test("recipient: create Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.received({
            receivedRequest: (rTemplate.cache!.content as RelationshipTemplateContent).onExistingRelationship!,
            requestSourceObject: rTemplate
        });
    });

    test("recipient: check prerequisites of Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
            requestId: rLocalRequest.id
        });
    });

    test("recipient: require manual decision of Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.requireManualDecision({
            requestId: rLocalRequest.id
        });
    });

    test("recipient: accept Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.accept({
            requestId: rLocalRequest.id.toString(),
            items: [
                {
                    accept: true
                }
            ]
        });
    });

    test("recipient: send Message with Response", async function () {
        rMessageWithResponse = await rAccountController.messages.sendMessage({
            content: ResponseWrapper.from({
                response: rLocalRequest.response!.content,
                requestId: rLocalRequest.id,
                requestSourceReference: rTemplate.id,
                requestSourceType: "RelationshipTemplate"
            }),
            recipients: [sAccountController.identity.address]
        });
    });

    test("recipient: complete Local Request", async function () {
        rLocalRequest = await rConsumptionController.incomingRequests.complete({
            requestId: rLocalRequest.id,
            responseSourceObject: rMessageWithResponse
        });
    });

    test("sender: syncEverything to get Message with Response", async function () {
        const messages = await TestUtil.syncUntilHasMessages(sAccountController);
        sMessageWithResponse = messages[0];
    });

    test("sender: create Local Request and Response from Relationship Change", async function () {
        const responseWrapper = sMessageWithResponse.cache!.content as ResponseWrapper;
        expect(responseWrapper).toBeInstanceOf(ResponseWrapper);

        const template = await sAccountController.relationshipTemplates.getRelationshipTemplate(responseWrapper.requestSourceReference);
        expect(template).toBeDefined();

        sLocalRequest = await sConsumptionController.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
            template: template!,
            responseSource: sMessageWithResponse,
            response: responseWrapper.response
        });
    });

    test("expectations", function () {
        // in the end, both Local Requests should be completed
        expect(rLocalRequest.status).toStrictEqual(LocalRequestStatus.Completed);
        expect(sLocalRequest.status).toStrictEqual(LocalRequestStatus.Completed);

        // the ids of the Local Requests should be equal
        expect(rLocalRequest.id.toString()).toStrictEqual(sLocalRequest.id.toString());

        // make sure (de-)serialization worked as expected
        expect(sTemplate.cache!.content).toBeInstanceOf(RelationshipTemplateContent);
        expect((sTemplate.cache!.content as RelationshipTemplateContent).onExistingRelationship).toBeInstanceOf(Request);

        expect(rTemplate.cache!.content).toBeInstanceOf(RelationshipTemplateContent);
        expect((rTemplate.cache!.content as RelationshipTemplateContent).onExistingRelationship).toBeInstanceOf(Request);

        expect(sLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(rLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);

        expect(sLocalRequest.response!.content.items[0]).toBeInstanceOf(AcceptResponseItem);
        expect(rLocalRequest.response!.content.items[0]).toBeInstanceOf(AcceptResponseItem);

        expect(sLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(rLocalRequest.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(sMessageWithResponse.cache!.content).toBeInstanceOf(ResponseWrapper);
        expect(rMessageWithResponse.cache!.content).toBeInstanceOf(ResponseWrapper);
    });
});
