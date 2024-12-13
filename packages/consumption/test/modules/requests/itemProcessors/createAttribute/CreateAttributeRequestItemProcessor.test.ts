import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ProprietaryInteger, ProprietaryString } from "@nmshd/content";
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
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns an Error when passing an Identity Attribute with owner={{Sender}}", async function () {
            const identityAttributeOfSender = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SENDER
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSender });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message: "Cannot create own IdentityAttributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead."
            });
        });

        test("returns a Success when passing an Identity Attribute with owner={{Empty}}", async function () {
            const identityAttributeWithEmptyOwner = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.EMPTY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeWithEmptyOwner });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns an Error when passing an Identity Attribute with owner={{SomeoneElse}}", async function () {
            const identityAttributeOfSomeoneElse = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSomeoneElse });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing an Identity Attribute with owner={{SomeoneElse}}, but no Recipient", async function () {
            const identityAttributeOfSomeoneElse = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSomeoneElse }, TestIdentity.UNDEFINED);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing a Relationship Attribute with owner={{Recipient}}", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.RECIPIENT
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with owner={{Sender}}", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSender });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with owner={{Empty}}", async function () {
            const relationshipAttributeWithEmptyOwner = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.EMPTY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithEmptyOwner });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns an Error when passing a Relationship Attribute with owner={{SomeoneElse}}", async function () {
            const relationshipAttributeOfSomeoneElse = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSomeoneElse });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing a Relationship Attribute with owner={{SomeoneElse}}, but no Recipient", async function () {
            const relationshipAttributeOfSomeoneElse = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSomeoneElse }, TestIdentity.UNDEFINED);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message:
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Error when passing a Relationship Attribute with same key as an already existing Relationship Attribute of this Relationship", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "uniqueKey"
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfSender);

            const relationshipAttributeWithSameKey = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "uniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithSameKey }, TestIdentity.RECIPIENT);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message:
                    "The creation of the provided RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
            });
        });

        test("returns Error on violation of key uniqueness even if the owner of the provided Relationship Attribute is an empty string as long as the Recipient is known", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.RECIPIENT,
                key: "uniqueKey"
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfRecipient);

            const relationshipAttributeWithSameKeyAndEmptyOwner = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.EMPTY,
                key: "uniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithSameKeyAndEmptyOwner }, TestIdentity.RECIPIENT);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message:
                    "The creation of the provided RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
            });
        });

        test("returns Success when passing a Relationship Attribute with same key but different owner", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "ownerSpecificUniqueKey"
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfSender);

            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.RECIPIENT,
                key: "ownerSpecificUniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient }, TestIdentity.RECIPIENT);
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with same key but different value type", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "valueTypeSpecificUniqueKey",
                value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" })
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfSender);

            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "valueTypeSpecificUniqueKey",
                value: ProprietaryInteger.from({ title: "aTitle", value: 1 })
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient }, TestIdentity.RECIPIENT);
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with same key as a Relationship Attribute in deletion", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "persistenceSpecificUniqueKey"
            });

            const createdAttribute = await When.iCreateARelationshipAttribute(relationshipAttributeOfSender);
            await When.iMarkMyAttributeAsToBeDeleted(createdAttribute);

            const relationshipAttributeWithSameKey = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "persistenceSpecificUniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithSameKey }, TestIdentity.RECIPIENT);
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a Relationship Attribute with same key as an already existing ThirdPartyRelationshipAttribute", async function () {
            const thirdPartyRelationshipAttribute = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "relationshipSpecificUniqueKey"
            });

            await When.iCreateAThirdPartyRelationshipAttribute(thirdPartyRelationshipAttribute);

            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER,
                key: "relationshipSpecificUniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSender }, TestIdentity.RECIPIENT);
            await Then.theCanCreateResultShouldBeASuccess();
        });
    });

    describe("canAccept", function () {
        test("can create a RelationshipAttribute", async function () {
            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.RECIPIENT
            });

            await When.iCallCanAccept();
            await Then.theCanAcceptResultShouldBeASuccess();
        });

        test("cannot create another RelationshipAttribute with same key", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.RECIPIENT
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfRecipient);

            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.RECIPIENT
            });

            await expect(When.iCallCanAccept()).rejects.toThrow(
                "error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes: 'The provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'aKey', owner and value type.'"
            );
        });

        test("cannot create another RelationshipAttribute with same key even if the owner of the provided Relationship Attribute is an empty string", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfSender);

            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.EMPTY
            });

            await expect(When.iCallCanAccept()).rejects.toThrow(
                "error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes: 'The provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'aKey', owner and value type.'"
            );
        });

        test("cannot accept because it would lead to the creation of another RelationshipAttribute with same key but rejecting of the CreateAttributeRequestItem would be permitted", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SENDER
            });

            await When.iCreateARelationshipAttribute(relationshipAttributeOfSender);

            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.EMPTY,
                itemMustBeAccepted: false
            });

            await When.iCallCanAccept();

            await Then.theCanAcceptResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidAcceptParameters",
                message:
                    "This CreateAttributeRequestItem cannot be accepted as the provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'aKey', owner and value type."
            });
        });
    });

    describe("accept", function () {
        test("in case of a RelationshipAttribute: creates a LocalAttribute with shareInfo for the peer of the Request", async function () {
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
