import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreAddress } from "@nmshd/core-types";
import { Transport } from "@nmshd/transport";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";
import { Context, GivenSteps, ThenSteps, WhenSteps } from "./Context";
import { TestIdentity } from "./TestIdentity";

describe("CreateAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let context: Context;
    let Given: GivenSteps; // eslint-disable-line @typescript-eslint/naming-convention
    let When: WhenSteps; // eslint-disable-line @typescript-eslint/naming-convention
    let Then: ThenSteps; // eslint-disable-line @typescript-eslint/naming-convention

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);

        context = await Context.init(transport);
        Given = new GivenSteps(context);
        When = new WhenSteps(context);
        Then = new ThenSteps(context);
    });

    afterAll(async function () {
        await connection.close();
    });

    describe("canCreateOutgoingRequestItem", function () {
        test("returns Success when passing an Identity Attribute with owner={{Recipient}}", async function () {
            const identityAttributeOfRecipient = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.RECIPIENT
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfRecipient });
            await Then.theResultShouldBeASuccess();
        });

        test("returns an Error when passing an Identity Attribute with owner={{Sender}}", async function () {
            const identityAttributeOfSender = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SENDER
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSender });
            await Then.theResultShouldBeAnErrorWith({
                message: "Cannot create own IdentityAttributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead."
            });
        });

        test("returns a Success when passing an Identity Attribute with owner={{Empty}}", async function () {
            const identityAttributeWithEmptyOwner = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.EMPTY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeWithEmptyOwner });
            await Then.theResultShouldBeASuccess();
        });

        test("returns an Error when passing an Identity Attribute with owner={{SomeoneElse}}", async function () {
            const identityAttributeOfSomeoneElse = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSomeoneElse });
            await Then.theResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be the Recipient's Address or an empty string. The latter will default to the Recipient's Address."
            });
        });

        test("returns Success when passing an Identity Attribute with owner={{SomeoneElse}}, but no Recipient", async function () {
            const identityAttributeOfSomeoneElse = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSomeoneElse }, TestIdentity.UNDEFINED);
            await Then.theResultShouldBeAnErrorWith({
                message: "The owner of the provided IdentityAttribute for the `attribute` property can only be an empty string. It will default to the Recipient's Address."
            });
        });

        test("returns Success when passing a Relationship Attribute with owner={{Recipient}}", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.RECIPIENT
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient });
            await Then.theResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with owner={{Sender}}", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSender });
            await Then.theResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with owner={{Empty}}", async function () {
            const relationshipAttributeWithEmptyOwner = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.EMPTY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithEmptyOwner });
            await Then.theResultShouldBeASuccess();
        });

        test("returns an Error when passing a Relationship Attribute with owner={{SomeoneElse}}", async function () {
            const relationshipAttributeOfSomeoneElse = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSomeoneElse });
            await Then.theResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing a Relationship Attribute with owner={{SomeoneElse}}, but no Recipient", async function () {
            const relationshipAttributeOfSomeoneElse = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSomeoneElse }, TestIdentity.UNDEFINED);
            await Then.theResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, recipient or an empty string. The latter will default to the address of the recipient."
            });
        });
    });

    describe("accept", function () {
        test("in case of a RelationshipAttribuite: creates a LocalAttribute with shareInfo for the peer of the Request", async function () {
            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.SENDER
            });
            await When.iCallAccept();
            await Then.aLocalRelationshipAttributeWithShareInfoForThePeerIsCreated();
        });

        test("in case of an IdentityAttribute: creates a Repository Attribute and a copy of it with shareInfo for the peer of the Request", async function () {
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.SENDER
            });
            await When.iCallAccept();
            await Then.aLocalRepositoryAttributeIsCreated();
            await Then.aLocalIdentityAttributeWithShareInfoForThePeerIsCreated();
        });
    });

    describe("applyIncomingResponseItem", function () {
        test.each([TestIdentity.RECIPIENT, TestIdentity.EMPTY])(
            "in case of an IdentityAttribute with owner=${value.toString()}: creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the request ",
            async function (attributeOwner: CoreAddress) {
                await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner });
                await Given.aResponseItem();
                await When.iCallApplyIncomingResponseItem();
                await Then.theCreatedAttributeHasTheSameContentAsTheAttributeFromTheRequestItem();
                await Then.theCreatedAttributeHasTheAttributeIdFromTheResponseItem();
            }
        );

        test.each([TestIdentity.RECIPIENT, TestIdentity.EMPTY, TestIdentity.SENDER])(
            "in case of a Relationship with owner=${value.toString()}: creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the request ",
            async function (attributeOwner: CoreAddress) {
                await Given.aRequestItemWithARelationshipAttribute({ attributeOwner });
                await Given.aResponseItem();
                await When.iCallApplyIncomingResponseItem();
                await Then.theCreatedAttributeHasTheSameContentAsTheAttributeFromTheRequestItem();
                await Then.theCreatedAttributeHasTheAttributeIdFromTheResponseItem();
            }
        );
    });
});
