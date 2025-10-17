import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { GivenName, ProprietaryInteger, ProprietaryString } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { Transport } from "@nmshd/transport";
import { EmittedAttributeDeletionStatus } from "../../../../../src";
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
        transport = TestUtil.createTransport();

        context = await Context.init(transport, connection);
        Given = new GivenSteps(context);
        When = new WhenSteps(context);
        Then = new ThenSteps(context);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(context.consumptionController));

    afterAll(async function () {
        await connection.close();
    });

    describe("canCreateOutgoingRequestItem", function () {
        test("returns Success when passing an IdentityAttribute with owner={{Peer}}", async function () {
            const identityAttributeOfRecipient = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.PEER
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfRecipient });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns an Error when passing an IdentityAttribute with owner={{CurrentIdentity}}", async function () {
            const identityAttributeOfSender = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.CURRENT_IDENTITY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSender });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message: "Cannot create OwnIdentityAttributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead."
            });
        });

        test("returns a Success when passing an IdentityAttribute with owner={{Empty}}", async function () {
            const identityAttributeWithEmptyOwner = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.EMPTY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeWithEmptyOwner });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns an Error when passing an IdentityAttribute with owner={{SomeoneElse}}", async function () {
            const identityAttributeOfSomeoneElse = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSomeoneElse });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing an IdentityAttribute with owner={{SomeoneElse}}, but no recipient", async function () {
            const identityAttributeOfSomeoneElse = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfSomeoneElse }, TestIdentity.UNDEFINED);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing a RelationshipAttribute with owner={{Peer}}", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.PEER
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a RelationshipAttribute with owner={{CurrentIdentity}}", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSender });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a RelationshipAttribute with owner={{Empty}}", async function () {
            const relationshipAttributeWithEmptyOwner = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.EMPTY
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithEmptyOwner });
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns an Error when passing a RelationshipAttribute with owner={{SomeoneElse}}", async function () {
            const relationshipAttributeOfSomeoneElse = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.SOMEONE_ELSE
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSomeoneElse });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                message:
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, the address of the recipient or an empty string. The latter will default to the address of the recipient."
            });
        });

        test("returns Success when passing a RelationshipAttribute with owner={{SomeoneElse}}, but no recipient", async function () {
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

        test("returns Error when passing an IdentityAttribute with invalid tag", async function () {
            const identityAttributeOfRecipient = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.PEER,
                tags: ["invalidTag"]
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfRecipient });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });

        test("returns Error when passing an IdentityAttribute with a forbidden character", async function () {
            const identityAttributeOfRecipient = TestObjectFactory.createIdentityAttribute({
                owner: TestIdentity.PEER,
                value: GivenName.from({ value: "aGivenName😀" })
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: identityAttributeOfRecipient });
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The Attribute contains forbidden characters."
            });
        });

        test("returns Error when passing a RelationshipAttribute with same key as an already existing RelationshipAttribute of this Relationship", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "uniqueKey"
            });

            await When.iCreateAnOwnRelationshipAttribute(relationshipAttributeOfSender);

            const relationshipAttributeWithSameKey = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "uniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithSameKey }, TestIdentity.PEER);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message:
                    "The creation of the provided RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
            });
        });

        test("returns Error on violation of key uniqueness even if the owner of the provided RelationshipAttribute is an empty string as long as the recipient is known", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.PEER,
                key: "uniqueKey"
            });

            await When.iCreateAPeerRelationshipAttribute(relationshipAttributeOfRecipient);

            const relationshipAttributeWithSameKeyAndEmptyOwner = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.EMPTY,
                key: "uniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithSameKeyAndEmptyOwner }, TestIdentity.PEER);
            await Then.theCanCreateResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message:
                    "The creation of the provided RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
            });
        });

        test("returns Success when passing a RelationshipAttribute with same key but different owner", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "ownerSpecificUniqueKey"
            });

            await When.iCreateAnOwnRelationshipAttribute(relationshipAttributeOfSender);

            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.PEER,
                key: "ownerSpecificUniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient }, TestIdentity.PEER);
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a RelationshipAttribute with same key but different value type", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "valueTypeSpecificUniqueKey",
                value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" })
            });

            await When.iCreateAnOwnRelationshipAttribute(relationshipAttributeOfSender);

            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "valueTypeSpecificUniqueKey",
                value: ProprietaryInteger.from({ title: "aTitle", value: 1 })
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfRecipient }, TestIdentity.PEER);
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a RelationshipAttribute with same key as a RelationshipAttribute in deletion", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "persistenceSpecificUniqueKey"
            });

            const createdAttribute = await When.iCreateAnOwnRelationshipAttribute(relationshipAttributeOfSender);
            await When.iMarkMyOwnRelationshipAttributeAsDeletedByRecipient(createdAttribute);

            const relationshipAttributeWithSameKey = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "persistenceSpecificUniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeWithSameKey }, TestIdentity.PEER);
            await Then.theCanCreateResultShouldBeASuccess();
        });

        test("returns Success when passing a RelationshipAttribute with same key as an already existing ThirdPartyRelationshipAttribute", async function () {
            const thirdPartyRelationshipAttribute = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.PEER,
                key: "relationshipSpecificUniqueKey"
            });

            await When.iCreateAThirdPartyRelationshipAttribute(thirdPartyRelationshipAttribute);

            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY,
                key: "relationshipSpecificUniqueKey"
            });

            await When.iCallCanCreateOutgoingRequestItemWith({ attribute: relationshipAttributeOfSender }, TestIdentity.PEER);
            await Then.theCanCreateResultShouldBeASuccess();
        });
    });

    describe("canAccept", function () {
        test("can create a RelationshipAttribute", async function () {
            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.PEER
            });

            await When.iCallCanAccept();
            await Then.theCanAcceptResultShouldBeASuccess();
        });

        test("cannot create an IdentityAttribute with a forbidden character", async function () {
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.PEER,
                value: GivenName.from({ value: "aGivenName😀" })
            });

            await expect(When.iCallCanAccept()).rejects.toThrow("error.consumption.attributes.forbiddenCharactersInAttribute: 'The Attribute contains forbidden characters.'");
        });

        test("cannot create another RelationshipAttribute with same key", async function () {
            const relationshipAttributeOfRecipient = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.PEER
            });

            await When.iCreateAPeerRelationshipAttribute(relationshipAttributeOfRecipient);

            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.PEER
            });

            await expect(When.iCallCanAccept()).rejects.toThrow(
                "error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes: 'The provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'aKey', owner and value type.'"
            );
        });

        test("cannot create another RelationshipAttribute with same key even if the owner of the provided RelationshipAttribute is an empty string", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY
            });

            await When.iCreateAnOwnRelationshipAttribute(relationshipAttributeOfSender);

            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.EMPTY
            });

            await expect(When.iCallCanAccept()).rejects.toThrow(
                "error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes: 'The provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'aKey', owner and value type.'"
            );
        });

        test("cannot accept because it would lead to the creation of another RelationshipAttribute with same key but rejecting of the CreateAttributeRequestItem would be permitted", async function () {
            const relationshipAttributeOfSender = TestObjectFactory.createRelationshipAttribute({
                owner: TestIdentity.CURRENT_IDENTITY
            });

            await When.iCreateAnOwnRelationshipAttribute(relationshipAttributeOfSender);

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

        test("cannot accept because the attribute has an invalid tag", async function () {
            await Given.aRequestItemWithAnIdentityAttribute({
                tags: ["invalidTag"],
                attributeOwner: TestIdentity.CURRENT_IDENTITY
            });

            await When.iCallCanAccept();

            await Then.theCanAcceptResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });

        test("cannot accept because the attribute has invalid tags", async function () {
            await Given.aRequestItemWithAnIdentityAttribute({
                tags: ["invalidTag1", "invalidTag2"],
                attributeOwner: TestIdentity.CURRENT_IDENTITY
            });

            await When.iCallCanAccept();

            await Then.theCanAcceptResultShouldBeAnErrorWith({
                code: "error.consumption.requests.invalidRequestItem",
                message: "Detected invalidity of the following tags: 'invalidTag1', 'invalidTag2'."
            });
        });
    });

    describe("accept", function () {
        test("in case of a RelationshipAttribute: creates an OwnRelationshipAttribute", async function () {
            await Given.aRequestItemWithARelationshipAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY
            });
            await When.iCallAccept();
            await Then.anOwnRelationshipAttributeIsCreated();
        });

        test("in case of an IdentityAttribute: creates a forwarded OwnIdentityAttribute", async function () {
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.aForwardedOwnIdentityAttributeIsCreated(GivenName.from("aGivenName").toJSON());
        });

        test("in case of an IdentityAttribute: trims the forwarded OwnIdentityAttribute", async function () {
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("    aGivenName ") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.aForwardedOwnIdentityAttributeIsCreated(GivenName.from("aGivenName").toJSON());
        });

        test("in case of an IdentityAttribute that already exists as OwnIdentityAttribute: adds a ForwardingDetails to the existing OwnIdentityAttribute", async function () {
            const ownIdentityAttribute = await Given.anOwnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.theOwnIdentityAttributeIsForwarded(ownIdentityAttribute);
        });

        test("in case of an IdentityAttribute where an OwnIdentityAttribute exists after trimming: adds a ForwardingDetails to the existing OwnIdentityAttribute", async function () {
            const ownIdentityAttribute = await Given.anOwnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("    aGivenName    ") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.theOwnIdentityAttributeIsForwarded(ownIdentityAttribute);
        });

        test("in case of an IdentityAttribute that already exists as OwnIdentityAttribute with different tags: merges tags by succession", async function () {
            await Given.anOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag2"],
                value: GivenName.from("aGivenName")
            });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag3"],
                value: GivenName.from("aGivenName")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.aForwardedOwnIdentityAttributeIsCreated();
            await Then.theTagsOfTheOwnIdentityAttributeMatch(["x:tag1", "x:tag2", "x:tag3"]);
        });

        test("in case of an IdentityAttribute that after trimming already exists as OwnIdentityAttribute with different tags: merges tags by succession", async function () {
            await Given.anOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag2"],
                value: GivenName.from("aGivenName")
            });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag3"],
                value: GivenName.from("    aGivenName  ")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.aForwardedOwnIdentityAttributeIsCreated();
            await Then.theTagsOfTheOwnIdentityAttributeMatch(["x:tag1", "x:tag2", "x:tag3"]);
        });

        test("in case of an IdentityAttribute that already is forwarded: returns an AttributeAlreadySharedAcceptResponseItem", async function () {
            const forwardedOwnIdentityAttribute = await Given.aForwardedOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER
            });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeAlreadySharedAcceptResponseItem");
            await Then.theIdOfTheAlreadySharedAttributeMatches(forwardedOwnIdentityAttribute.id);
        });

        test("in case of an IdentityAttribute that after trimming already exists and has as a ForwardingDetails: returns an AttributeAlreadySharedAcceptResponseItem", async function () {
            const ownIdentityAttribute = await Given.aForwardedOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER
            });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("    aGivenName  ") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeAlreadySharedAcceptResponseItem");
            await Then.theIdOfTheAlreadySharedAttributeMatches(ownIdentityAttribute.id);
        });

        test("in case of an IdentityAttribute that already has a ForwardingDetails but is deleted by peer: adds another forwardedSharingDetails without deletionInfo", async function () {
            const ownIdentityAttribute = await Given.aForwardedOwnIdentityAttributeWithDeletionInfo({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER,
                deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient
            });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.theOwnIdentityAttributeIsForwarded(ownIdentityAttribute);
            await Then.theOwnIdentityAttributeIsDeletedByRecipient(ownIdentityAttribute, TestIdentity.PEER);
        });

        test("in case of an IdentityAttribute that already has a ForwardingDetails but is to be deleted by peer: removes the EmittedAttributeDeletionInfo", async function () {
            const ownIdentityAttribute = await Given.aForwardedOwnIdentityAttributeWithDeletionInfo({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER,
                deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient
            });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.CURRENT_IDENTITY, value: GivenName.from("aGivenName") });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeAlreadySharedAcceptResponseItem");
            await Then.theOwnIdentityAttributeIsForwarded(ownIdentityAttribute);
        });

        test("in case of an IdentityAttribute that already exists with different tags and has as a ForwardingDetails: returns an AttributeSuccessionAcceptResponseItem", async function () {
            await Given.aForwardedOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag2"],
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER
            });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag3"],
                value: GivenName.from("aGivenName")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeSuccessionAcceptResponseItem");
            await Then.theTagsOfTheSucceededOwnIdentityAttributeMatch(["x:tag1", "x:tag2", "x:tag3"]);
        });

        test("in case of an IdentityAttribute that after trimming already exists with different tags and has as a ForwardingDetails: returns an AttributeSuccessionAcceptResponseItem", async function () {
            await Given.aForwardedOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag2"],
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER
            });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                tags: ["x:tag1", "x:tag3"],
                value: GivenName.from(" aGivenName  ")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeSuccessionAcceptResponseItem");
            await Then.theTagsOfTheSucceededOwnIdentityAttributeMatch(["x:tag1", "x:tag2", "x:tag3"]);
            await Then.theSuccessorAttributeValueMatches(GivenName.from("aGivenName").toJSON());
        });

        test("in case of an IdentityAttribute whose predecessor was shared: returns an AttributeSuccessionAcceptResponseItem", async function () {
            const forwardedOwnIdentityAttributePredecessor = await Given.aForwardedOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER
            });
            await Given.anOwnIdentityAttributeSuccession(forwardedOwnIdentityAttributePredecessor.id, { value: GivenName.from("aSucceededGivenName") });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aSucceededGivenName")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeSuccessionAcceptResponseItem");
            await Then.thePredecessorIdOfTheSucceededAttributeMatches(forwardedOwnIdentityAttributePredecessor.id);
        });

        test("in case of an IdentityAttribute whose predecessor was shared with different tags: returns an AttributeSuccessionAcceptResponseItem", async function () {
            const forwardedOwnIdentityAttributePredecessor = await Given.aForwardedOwnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                tags: ["x:tag1", "x:tag2"],
                peer: TestIdentity.PEER
            });
            await Given.anOwnIdentityAttributeSuccession(forwardedOwnIdentityAttributePredecessor.id, { value: GivenName.from("aSucceededGivenName"), tags: ["x:tag1", "x:tag2"] });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aSucceededGivenName"),
                tags: ["x:tag1", "x:tag3"]
            });
            await When.iCallAccept();
            await Then.theTagsOfTheSucceededOwnIdentityAttributeMatch(["x:tag1", "x:tag2", "x:tag3"]);
            await Then.theResponseItemShouldBeOfType("AttributeSuccessionAcceptResponseItem");
            await Then.thePredecessorIdOfTheSucceededAttributeMatches(forwardedOwnIdentityAttributePredecessor.id);
        });

        test("in case of an IdentityAttribute whose predecessor was shared but is deleted by peer: returns a CreateAttributeAcceptResponseItem", async function () {
            const forwardedOwnIdentityAttributePredecessor = await Given.aForwardedOwnIdentityAttributeWithDeletionInfo({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER,
                deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient
            });
            const ownIdentityAttributeSuccessor = await Given.anOwnIdentityAttributeSuccession(forwardedOwnIdentityAttributePredecessor.id, {
                value: GivenName.from("aSucceededGivenName")
            });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aSucceededGivenName")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("CreateAttributeAcceptResponseItem");
            await Then.theOwnIdentityAttributeIsForwarded(ownIdentityAttributeSuccessor);
        });

        test("in case of an IdentityAttribute whose predecessor was shared but is to be deleted by peer: returns an AttributeSuccessionAcceptResponseItem", async function () {
            const forwardedOwnIdentityAttributePredecessor = await Given.aForwardedOwnIdentityAttributeWithDeletionInfo({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aGivenName"),
                peer: TestIdentity.PEER,
                deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient
            });
            await Given.anOwnIdentityAttributeSuccession(forwardedOwnIdentityAttributePredecessor.id, { value: GivenName.from("aSucceededGivenName") });
            await Given.aRequestItemWithAnIdentityAttribute({
                attributeOwner: TestIdentity.CURRENT_IDENTITY,
                value: GivenName.from("aSucceededGivenName")
            });
            await When.iCallAccept();
            await Then.theResponseItemShouldBeOfType("AttributeSuccessionAcceptResponseItem");
            await Then.thePredecessorIdOfTheSucceededAttributeMatches(forwardedOwnIdentityAttributePredecessor.id);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test.each([TestIdentity.PEER, TestIdentity.EMPTY])(
            "in case of an IdentityAttribute with owner=%s: creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the request ",
            async function (attributeOwner: CoreAddress) {
                await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner });
                await Given.aCreateAttributeAcceptResponseItem();
                await When.iCallApplyIncomingResponseItem();
                await Then.theCreatedAttributeHasTheSameContentAsTheAttributeFromTheRequestItem();
                await Then.theCreatedAttributeHasTheAttributeIdFromTheResponseItem();
            }
        );

        test.each([TestIdentity.PEER, TestIdentity.EMPTY, TestIdentity.CURRENT_IDENTITY])(
            "in case of a RelationshipAttribute with owner=%s: creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the request ",
            async function (attributeOwner: CoreAddress) {
                await Given.aRequestItemWithARelationshipAttribute({ attributeOwner });
                await Given.aCreateAttributeAcceptResponseItem();
                await When.iCallApplyIncomingResponseItem();
                await Then.theCreatedAttributeHasTheSameContentAsTheAttributeFromTheRequestItem();
                await Then.theCreatedAttributeHasTheAttributeIdFromTheResponseItem();
            }
        );

        test("in case of an AttributeSuccessionAcceptResponseItem succeed the PeerIdentityAttribute", async function () {
            const peerIdentityAttribute = await Given.aPeerIdentityAttribute({ peer: TestIdentity.PEER });
            await Given.aRequestItemWithAnIdentityAttribute({ attributeOwner: TestIdentity.PEER });
            await Given.anAttributeSuccessionAcceptResponseItem({ predecessorId: peerIdentityAttribute.id });
            await When.iCallApplyIncomingResponseItem();
            await Then.thePeerIdentityAttributeWasSucceeded({ predecessorId: peerIdentityAttribute.id });
        });
    });
});
