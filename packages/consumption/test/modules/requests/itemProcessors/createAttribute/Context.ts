/* eslint-disable jest/no-standalone-expect */
import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    ConsumptionController,
    ConsumptionCoreErrors,
    ConsumptionIds,
    CreateAttributeRequestItemProcessor,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    IOwnIdentityAttributeSuccessorParams,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ValidationResult
} from "@nmshd/consumption";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    AttributeValues,
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    IdentityAttribute,
    RelationshipAttribute,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport, TransportCoreErrors } from "@nmshd/transport";
import { TestUtil } from "../../../../core/TestUtil.js";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory.js";
import { TestIdentity } from "./TestIdentity.js";

export class Context {
    public accountController: AccountController;
    public consumptionController: ConsumptionController;
    public processor: CreateAttributeRequestItemProcessor;

    public givenResponseItem: CreateAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem;
    public givenRequestItem: CreateAttributeRequestItem;
    public canCreateResult: ValidationResult;
    public canAcceptResult: ValidationResult;
    public peerAddress: CoreAddress;
    public responseItemAfterAction: CreateAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem;
    public createdAttributeAfterAction: LocalAttribute;

    private constructor(consumptionController: ConsumptionController) {
        this.consumptionController = consumptionController;
        this.accountController = consumptionController.accountController;
        this.peerAddress = CoreAddress.from("peer");
        this.processor = new CreateAttributeRequestItemProcessor(this.consumptionController);
    }

    public static async init(transport: Transport, connection: IDatabaseConnection): Promise<Context> {
        await transport.init();
        const account = (await TestUtil.provideAccounts(transport, connection, 1))[0];
        return new Context(account.consumptionController);
    }

    public fillTestIdentitiesOfObject(value: any): void {
        if (value === null) {
            return;
        }

        if (typeof value !== "object") return;

        for (const propertyName in value) {
            const propertyValue = value[propertyName];
            if (typeof propertyValue === "object") {
                this.fillTestIdentitiesOfObject(propertyValue);
            }

            if (propertyValue instanceof CoreAddress) {
                value[propertyName] = this.translateTestIdentity(propertyValue);
            }

            if (typeof propertyValue === "string") {
                value[propertyName] = this.translateTestIdentityToString(propertyValue);
            }
        }
    }

    public translateTestIdentity(testIdentity: CoreAddress): CoreAddress | undefined {
        switch (testIdentity.toString()) {
            case TestIdentity.CURRENT_IDENTITY.toString():
                return this.accountController.identity.address;
            case TestIdentity.PEER.toString():
                return this.peerAddress;
            case TestIdentity.EMPTY.toString():
                return CoreAddress.from("");
            case TestIdentity.UNDEFINED.toString():
                return undefined;
            case TestIdentity.SOMEONE_ELSE.toString():
                return CoreAddress.from("someoneElse");
            default:
                return CoreAddress.from(testIdentity);
        }
    }

    public translateTestIdentityToString(testIdentity: string): string | undefined {
        return this.translateTestIdentity(CoreAddress.from(testIdentity))?.toString();
    }
}

export class GivenSteps {
    public constructor(private readonly context: Context) {}

    public aRequestItemWithARelationshipAttribute(params: { attributeOwner: CoreAddress; itemMustBeAccepted?: boolean }): Promise<void> {
        const attribute = TestObjectFactory.createRelationshipAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner)
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        this.context.givenRequestItem = CreateAttributeRequestItem.from({
            attribute: attribute,
            mustBeAccepted: params.itemMustBeAccepted ?? true
        });
        return Promise.resolve();
    }

    public aRequestItemWithAnIdentityAttribute(params: { attributeOwner: CoreAddress; tags?: string[]; value?: AttributeValues.Identity.Interface }): Promise<void> {
        const attribute = TestObjectFactory.createIdentityAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner),
            tags: params.tags,
            value: params.value
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        this.context.givenRequestItem = CreateAttributeRequestItem.from({
            attribute: attribute,
            mustBeAccepted: true
        });
        return Promise.resolve();
    }

    public async aCreateAttributeAcceptResponseItem(): Promise<void> {
        this.context.givenResponseItem = CreateAttributeAcceptResponseItem.from({
            attributeId: await ConsumptionIds.attribute.generate(),
            result: ResponseItemResult.Accepted
        });
    }

    public async anAttributeSuccessionAcceptResponseItem(params: { predecessorId: CoreId }): Promise<void> {
        this.context.givenResponseItem = AttributeSuccessionAcceptResponseItem.from({
            predecessorId: params.predecessorId,
            successorId: await ConsumptionIds.attribute.generate(),
            successorContent: TestObjectFactory.createIdentityAttribute({ owner: this.context.translateTestIdentity(TestIdentity.PEER), tags: ["x:succeededTag"] }),
            result: ResponseItemResult.Accepted
        });
    }

    public async anOwnIdentityAttribute(params: { attributeOwner: CoreAddress; tags?: string[]; value?: AttributeValues.Identity.Interface }): Promise<OwnIdentityAttribute> {
        const attribute = TestObjectFactory.createIdentityAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner),
            tags: params.tags,
            value: params.value
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        const createdOwnIdentityAttribute = await this.context.consumptionController.attributes.createOwnIdentityAttribute({ content: attribute });
        return createdOwnIdentityAttribute;
    }

    public async anOwnIdentityAttributeSuccession(predecessorId: CoreId, params: { tags?: string[]; value?: AttributeValues.Identity.Interface }): Promise<OwnIdentityAttribute> {
        const predecessor = await this.context.consumptionController.attributes.getLocalAttribute(predecessorId);

        if (!predecessor) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, predecessorId.toString());
        }

        if (!(predecessor instanceof OwnIdentityAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(`The Attribute ${predecessorId} is not an OwnIdentityAttribute.`);
        }

        const ownIdentityAttributeSuccessorParams: IOwnIdentityAttributeSuccessorParams = {
            content: IdentityAttribute.from({
                value: params.value ?? predecessor.content.value,
                owner: this.context.consumptionController.accountController.identity.address,
                tags: params.tags
            })
        };

        const ownIdentityAttributesAfterSuccession = await this.context.consumptionController.attributes.succeedOwnIdentityAttribute(
            predecessor,
            ownIdentityAttributeSuccessorParams
        );
        return ownIdentityAttributesAfterSuccession.successor;
    }

    public async aForwardedOwnIdentityAttribute(params: {
        attributeOwner: CoreAddress;
        tags?: string[];
        value?: AttributeValues.Identity.Interface;
        peer: CoreAddress;
    }): Promise<OwnIdentityAttribute> {
        const attribute = TestObjectFactory.createIdentityAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner),
            tags: params.tags,
            value: params.value
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        const createdOwnIdentityAttribute = await this.context.consumptionController.attributes.createOwnIdentityAttribute({ content: attribute });

        const forwardedOwnIdentityAttribute = await this.context.consumptionController.attributes.addForwardingDetailsToAttribute(
            createdOwnIdentityAttribute,
            this.context.translateTestIdentity(params.peer)!,
            CoreId.from("aSourceReferenceId")
        );

        return forwardedOwnIdentityAttribute;
    }

    public async aPeerIdentityAttribute(params: { peer: CoreAddress }): Promise<PeerIdentityAttribute> {
        const createdPeerIdentityAttribute = await this.context.consumptionController.attributes.createPeerIdentityAttribute({
            content: TestObjectFactory.createIdentityAttribute({ owner: this.context.translateTestIdentity(params.peer) }),
            peer: this.context.translateTestIdentity(params.peer)!,
            sourceReference: CoreId.from("aSourceReferenceId"),
            id: CoreId.from("aPeerIdentityAttributeId")
        });
        return createdPeerIdentityAttribute;
    }

    public async aForwardedOwnIdentityAttributeWithDeletionInfo(params: {
        attributeOwner: CoreAddress;
        tags?: string[];
        value?: AttributeValues.Identity.Interface;
        peer: CoreAddress;
        deletionStatus: EmittedAttributeDeletionStatus;
    }): Promise<OwnIdentityAttribute> {
        const attribute = TestObjectFactory.createIdentityAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner),
            tags: params.tags,
            value: params.value
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        const createdOwnIdentityAttribute = await this.context.consumptionController.attributes.createOwnIdentityAttribute({ content: attribute });

        const forwardedOwnIdentityAttribute = await this.context.consumptionController.attributes.addForwardingDetailsToAttribute(
            createdOwnIdentityAttribute,
            this.context.translateTestIdentity(params.peer)!,
            CoreId.from("aSourceReferenceId")
        );

        await this.context.consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
            forwardedOwnIdentityAttribute,
            EmittedAttributeDeletionInfo.from({
                deletionStatus: params.deletionStatus,
                deletionDate:
                    params.deletionStatus === EmittedAttributeDeletionStatus.ToBeDeletedByRecipient ? CoreDate.utc().add({ days: 1 }) : CoreDate.utc().subtract({ days: 1 })
            }),
            CoreAddress.from("peer")
        );

        const forwardedOwnIdentityAttributeWithDeletionInfo = await this.context.consumptionController.attributes.getLocalAttribute(forwardedOwnIdentityAttribute.id);

        return forwardedOwnIdentityAttributeWithDeletionInfo as OwnIdentityAttribute;
    }
}

export class ThenSteps {
    public constructor(private readonly context: Context) {}

    public theCanCreateResultShouldBeASuccess(): Promise<void> {
        expect(this.context.canCreateResult).successfulValidationResult();
        return Promise.resolve();
    }

    public theCanCreateResultShouldBeAnErrorWith(error: { message?: string | RegExp; code?: string }): Promise<void> {
        expect(this.context.canCreateResult).errorValidationResult(error);
        return Promise.resolve();
    }

    public theCanAcceptResultShouldBeASuccess(): Promise<void> {
        expect(this.context.canAcceptResult).successfulValidationResult();
        return Promise.resolve();
    }

    public theCanAcceptResultShouldBeAnErrorWith(error: { message?: string | RegExp; code?: string }): Promise<void> {
        expect(this.context.canAcceptResult).errorValidationResult(error);
        return Promise.resolve();
    }

    public theResponseItemShouldBeOfType(
        responseItemType: "CreateAttributeAcceptResponseItem" | "AttributeAlreadySharedAcceptResponseItem" | "AttributeSuccessionAcceptResponseItem"
    ): Promise<void> {
        expect(this.context.responseItemAfterAction.toJSON()["@type"]).toBe(responseItemType);
        return Promise.resolve();
    }

    public async aForwardedOwnIdentityAttributeIsCreated(value?: AttributeValues.Identity.Json): Promise<void> {
        expect((this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId).toBeDefined();

        const createdForwardedOwnIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        if (!createdForwardedOwnIdentityAttribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId.toString());
        }

        if (!(createdForwardedOwnIdentityAttribute instanceof OwnIdentityAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(`The Attribute ${createdForwardedOwnIdentityAttribute.id} is not an OwnIdentityAttribute.`);
        }

        expect(createdForwardedOwnIdentityAttribute).toBeDefined();
        expect(createdForwardedOwnIdentityAttribute instanceof OwnIdentityAttribute).toBe(true);
        expect(createdForwardedOwnIdentityAttribute.numberOfForwards).toBe(1);

        const isForwarded = await this.context.consumptionController.attributes.isAttributeForwardedToPeer(createdForwardedOwnIdentityAttribute, this.context.peerAddress);
        expect(isForwarded).toBe(true);

        if (value) expect(createdForwardedOwnIdentityAttribute.content.value.toJSON()).toStrictEqual(value);
    }

    public async theOwnIdentityAttributeIsForwarded(attribute: OwnIdentityAttribute): Promise<void> {
        expect((this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId).toBeDefined();

        const forwardedOwnIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        if (!forwardedOwnIdentityAttribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId.toString());
        }

        if (!(forwardedOwnIdentityAttribute instanceof OwnIdentityAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(`The Attribute ${forwardedOwnIdentityAttribute.id} is not an OwnIdentityAttribute.`);
        }

        expect(forwardedOwnIdentityAttribute).toBeDefined();
        expect(forwardedOwnIdentityAttribute.id.toString()).toBe(attribute.id.toString());
        expect(forwardedOwnIdentityAttribute.content.toJSON()).toStrictEqual(attribute.content.toJSON());
        expect(forwardedOwnIdentityAttribute.numberOfForwards).toBeGreaterThanOrEqual(1);

        const isForwarded = await this.context.consumptionController.attributes.isAttributeForwardedToPeer(forwardedOwnIdentityAttribute, this.context.peerAddress);
        expect(isForwarded).toBe(true);
    }

    public async theOwnIdentityAttributeIsDeletedByRecipient(attribute: OwnIdentityAttribute, peer: CoreAddress): Promise<void> {
        const attributesDeletedByRecipient = await this.context.consumptionController.attributes.getLocalAttributes({
            id: attribute.id.toString(),
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        });

        expect(attributesDeletedByRecipient).toBeDefined();
    }

    public async anOwnRelationshipAttributeIsCreated(): Promise<void> {
        expect((this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId).toBeDefined();

        const createdAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        if (!createdAttribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId.toString());
        }

        if (!(createdAttribute instanceof OwnRelationshipAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(`The Attribute ${createdAttribute.id} is not an OwnRelationshipAttribute.`);
        }

        expect(createdAttribute).toBeDefined();
        expect(createdAttribute.peer.toString()).toStrictEqual(this.context.peerAddress.toString());
        expect(createdAttribute.numberOfForwards).toBe(0);
    }

    public theIdOfTheAlreadySharedAttributeMatches(id: CoreId): Promise<void> {
        expect((this.context.responseItemAfterAction as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(id);

        return Promise.resolve();
    }

    public thePredecessorIdOfTheSucceededAttributeMatches(id: CoreId): Promise<void> {
        expect((this.context.responseItemAfterAction as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(id);

        return Promise.resolve();
    }

    public async theTagsOfTheOwnIdentityAttributeMatch(tags: string[]): Promise<void> {
        const ownIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        expect((ownIdentityAttribute!.content as IdentityAttribute).tags?.sort()).toStrictEqual(tags.sort());
    }

    public async theTagsOfTheSucceededOwnIdentityAttributeMatch(tags: string[]): Promise<void> {
        const ownIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as AttributeSuccessionAcceptResponseItem).successorId
        );

        expect((ownIdentityAttribute!.content as IdentityAttribute).tags?.sort()).toStrictEqual(tags.sort());
    }

    public async theSuccessorAttributeValueMatches(value: AttributeValues.Identity.Json): Promise<void> {
        const attribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as AttributeSuccessionAcceptResponseItem).successorId
        );

        expect(attribute!.content.value.toJSON()).toStrictEqual(value);
    }

    public theCreatedAttributeHasTheAttributeIdFromTheResponseItem(): Promise<void> {
        expect(this.context.createdAttributeAfterAction.id.toString()).toStrictEqual((this.context.givenResponseItem as CreateAttributeAcceptResponseItem).attributeId.toString());

        return Promise.resolve();
    }

    public theCreatedAttributeHasTheSameContentAsTheAttributeFromTheRequestItem(): Promise<void> {
        expect(this.context.createdAttributeAfterAction.content.toJSON()).toStrictEqual(this.context.givenRequestItem.attribute.toJSON());

        return Promise.resolve();
    }

    public async thePeerIdentityAttributeWasSucceeded(params: { predecessorId: CoreId }): Promise<void> {
        const peerIdentityAttributePredecessor = await this.context.consumptionController.attributes.getLocalAttribute(params.predecessorId);
        expect(peerIdentityAttributePredecessor!.succeededBy).toBeDefined();
    }
}

export class WhenSteps {
    public constructor(private readonly context: Context) {}

    public async iCreateAnOwnRelationshipAttribute(relationshipAttribute?: RelationshipAttribute): Promise<OwnRelationshipAttribute> {
        relationshipAttribute ??= TestObjectFactory.createRelationshipAttribute({
            owner: this.context.accountController.identity.address
        });
        this.context.fillTestIdentitiesOfObject(relationshipAttribute);

        return await this.context.consumptionController.attributes.createOwnRelationshipAttribute({
            content: relationshipAttribute,
            sourceReference: CoreId.from("aSourceReferenceId"),
            peer: CoreAddress.from("peer")
        });
    }

    public async iCreateAPeerRelationshipAttribute(relationshipAttribute?: RelationshipAttribute): Promise<PeerRelationshipAttribute> {
        relationshipAttribute ??= TestObjectFactory.createRelationshipAttribute({
            owner: this.context.accountController.identity.address
        });
        this.context.fillTestIdentitiesOfObject(relationshipAttribute);

        return await this.context.consumptionController.attributes.createPeerRelationshipAttribute({
            content: relationshipAttribute,
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("aSourceReferenceId")
        });
    }

    public async iCreateAThirdPartyRelationshipAttribute(relationshipAttribute?: RelationshipAttribute): Promise<void> {
        relationshipAttribute ??= TestObjectFactory.createRelationshipAttribute({
            owner: CoreAddress.from("peer")
        });
        this.context.fillTestIdentitiesOfObject(relationshipAttribute);

        await this.context.consumptionController.attributes.createThirdPartyRelationshipAttribute({
            content: relationshipAttribute,
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("aSourceReferenceId"),
            initialAttributePeer: CoreAddress.from("aThirdParty"),
            id: CoreId.from("aThirdPartyRelationshipAttributeId")
        });
    }

    public async iMarkMyOwnRelationshipAttributeAsDeletedByRecipient(attribute: OwnRelationshipAttribute): Promise<void> {
        this.context.fillTestIdentitiesOfObject(attribute);

        attribute.deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
            deletionDate: CoreDate.utc().subtract({ minutes: 5 })
        });

        await this.context.consumptionController.attributes.updateAttributeUnsafe(attribute);
    }

    public async iCallCanCreateOutgoingRequestItemWith(partialRequestItem: Partial<CreateAttributeRequestItem>, recipient: CoreAddress = TestIdentity.PEER): Promise<void> {
        partialRequestItem.mustBeAccepted ??= true;
        partialRequestItem.attribute ??= TestObjectFactory.createIdentityAttribute({
            owner: this.context.accountController.identity.address
        });

        partialRequestItem.attribute.owner = this.context.translateTestIdentity(partialRequestItem.attribute.owner)!;

        const requestItem = CreateAttributeRequestItem.from(partialRequestItem as CreateAttributeRequestItem);

        this.context.fillTestIdentitiesOfObject(requestItem);

        this.context.canCreateResult = await this.context.processor.canCreateOutgoingRequestItem(requestItem, null!, this.context.translateTestIdentity(recipient));
    }

    public async iCallCanAccept(): Promise<void> {
        this.context.canAcceptResult = await this.context.processor.canAccept(this.context.givenRequestItem, null!, {
            id: CoreId.from("request-id"),
            peer: this.context.peerAddress
        });
    }

    public async iCallAccept(): Promise<void> {
        this.context.responseItemAfterAction = await this.context.processor.accept(this.context.givenRequestItem, null!, {
            id: CoreId.from("request-id"),
            peer: this.context.peerAddress
        });
    }

    public async iCallApplyIncomingResponseItem(): Promise<void> {
        await this.context.processor.applyIncomingResponseItem(this.context.givenResponseItem, this.context.givenRequestItem, {
            id: CoreId.from("request-id"),
            peer: this.context.peerAddress
        });

        if (this.context.givenResponseItem instanceof CreateAttributeAcceptResponseItem) {
            this.context.createdAttributeAfterAction = (await this.context.consumptionController.attributes.getLocalAttribute(this.context.givenResponseItem.attributeId))!;
        }
    }
}
