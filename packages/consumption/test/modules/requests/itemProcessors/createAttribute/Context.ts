/* eslint-disable jest/no-standalone-expect */
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
import { CoreAddress, CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    ConsumptionIds,
    CreateAttributeRequestItemProcessor,
    IAttributeSuccessorParams,
    ILocalAttribute,
    LocalAttribute,
    LocalAttributeDeletionInfo,
    LocalAttributeDeletionStatus,
    ValidationResult
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";
import { TestIdentity } from "./TestIdentity";

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

    public static async init(transport: Transport): Promise<Context> {
        await transport.init();
        const account = (await TestUtil.provideAccounts(transport, 1))[0];
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
            successorContent: TestObjectFactory.createIdentityAttribute({ owner: this.context.translateTestIdentity(TestIdentity.PEER), tags: ["succeededTag"] }),
            result: ResponseItemResult.Accepted
        });
    }

    public async aRepositoryAttribute(params: { attributeOwner: CoreAddress; tags?: string[]; value?: AttributeValues.Identity.Interface }): Promise<LocalAttribute> {
        const attribute = TestObjectFactory.createIdentityAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner),
            tags: params.tags,
            value: params.value
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        const createdRepositoryAttribute = await this.context.consumptionController.attributes.createRepositoryAttribute({ content: attribute });
        return createdRepositoryAttribute;
    }

    public async aRepositoryAttributeSuccession(predecessorId: CoreId, params: { tags?: string[]; value?: AttributeValues.Identity.Interface }): Promise<LocalAttribute> {
        const predecessor = await this.context.consumptionController.attributes.getLocalAttribute(predecessorId);

        const repositorySuccessorParams: IAttributeSuccessorParams = {
            content: IdentityAttribute.from({
                value: params.value ?? (predecessor!.content as IdentityAttribute).value,
                owner: this.context.consumptionController.accountController.identity.address,
                tags: params.tags
            })
        };

        const repositoryAttributesAfterSuccession = await this.context.consumptionController.attributes.succeedRepositoryAttribute(predecessorId, repositorySuccessorParams);
        return repositoryAttributesAfterSuccession.successor;
    }

    public async anOwnSharedIdentityAttribute(params: { sourceAttributeId: CoreId; peer: CoreAddress }): Promise<LocalAttribute> {
        const createdOwnSharedIdentityAttribute = await this.context.consumptionController.attributes.createSharedLocalAttributeCopy({
            sourceAttributeId: params.sourceAttributeId,
            peer: this.context.translateTestIdentity(params.peer)!,
            requestReference: CoreId.from("reqRef")
        });
        return createdOwnSharedIdentityAttribute;
    }

    public async aPeerSharedIdentityAttribute(params: { peer: CoreAddress }): Promise<LocalAttribute> {
        const createdPeerSharedIdentityAttribute = await this.context.consumptionController.attributes.createSharedLocalAttribute({
            peer: this.context.translateTestIdentity(params.peer)!,
            requestReference: CoreId.from("reqRef"),
            content: TestObjectFactory.createIdentityAttribute({ owner: this.context.translateTestIdentity(params.peer) })
        });
        return createdPeerSharedIdentityAttribute;
    }

    public async anAttribute(attributeData: Omit<ILocalAttribute, "id" | "createdAt"> & { id?: ICoreId; createdAt?: ICoreDate }): Promise<LocalAttribute> {
        const createdAttribute = await this.context.consumptionController.attributes.createAttributeUnsafe(attributeData);
        return createdAttribute;
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

    public async aRepositoryAttributeIsCreated(value?: AttributeValues.Identity.Json): Promise<void> {
        expect((this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId).toBeDefined();

        const createdSharedAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        const createdRepositoryAttribute = await this.context.consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);

        expect(createdRepositoryAttribute).toBeDefined();
        expect(createdRepositoryAttribute!.shareInfo).toBeUndefined();
        if (value) expect(createdRepositoryAttribute!.content.value.toJSON()).toStrictEqual(value);
    }

    public async anOwnSharedIdentityAttributeIsCreated(params?: { sourceAttribute?: CoreId; value?: AttributeValues.Identity.Json }): Promise<void> {
        expect((this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId).toBeDefined();

        const createdAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        expect(createdAttribute).toBeDefined();
        expect(createdAttribute!.shareInfo).toBeDefined();
        expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(this.context.peerAddress.toString());
        expect(createdAttribute!.shareInfo!.sourceAttribute).toBeDefined();
        if (params?.value) expect(createdAttribute!.content.value.toJSON()).toStrictEqual(params.value);

        if (params?.sourceAttribute) {
            expect(createdAttribute!.shareInfo!.sourceAttribute!.toString()).toStrictEqual(params.sourceAttribute.toString());
        }
    }

    public async anOwnSharedRelationshipAttributeIsCreated(): Promise<void> {
        expect((this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId).toBeDefined();

        const createdAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        expect(createdAttribute).toBeDefined();
        expect(createdAttribute!.shareInfo).toBeDefined();
        expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(this.context.peerAddress.toString());
        expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
    }

    public async theSourceAttributeIdOfTheCreatedOwnSharedIdentityAttributeMatches(id: CoreId): Promise<void> {
        const ownSharedIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );
        expect(ownSharedIdentityAttribute!.shareInfo!.sourceAttribute).toStrictEqual(id);
    }

    public theIdOfTheAlreadySharedAttributeMatches(id: CoreId): Promise<void> {
        expect((this.context.responseItemAfterAction as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(id);

        return Promise.resolve();
    }

    public thePredecessorIdOfTheSucceededAttributeMatches(id: CoreId): Promise<void> {
        expect((this.context.responseItemAfterAction as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(id);

        return Promise.resolve();
    }

    public async theTagsOfTheRepositoryAttributeMatch(tags: string[]): Promise<void> {
        const ownSharedIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as CreateAttributeAcceptResponseItem).attributeId
        );

        const repositoryAttribute = await this.context.consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
        expect((repositoryAttribute!.content as IdentityAttribute).tags?.sort()).toStrictEqual(tags.sort());
    }

    public async theTagsOfTheSucceededRepositoryAttributeMatch(tags: string[]): Promise<void> {
        const ownSharedIdentityAttribute = await this.context.consumptionController.attributes.getLocalAttribute(
            (this.context.responseItemAfterAction as AttributeSuccessionAcceptResponseItem).successorId
        );

        const repositoryAttribute = await this.context.consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
        expect((repositoryAttribute!.content as IdentityAttribute).tags?.sort()).toStrictEqual(tags.sort());
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

    public async thePeerSharedIdentityAttributeWasSucceeded(params: { predecessorId: CoreId }): Promise<void> {
        const peerSharedIdentityAttributePredecessor = await this.context.consumptionController.attributes.getLocalAttribute(params.predecessorId);
        expect(peerSharedIdentityAttributePredecessor!.succeededBy).toBeDefined();
    }
}

export class WhenSteps {
    public constructor(private readonly context: Context) {}

    public async iCreateARelationshipAttribute(relationshipAttribute?: RelationshipAttribute): Promise<LocalAttribute> {
        relationshipAttribute ??= TestObjectFactory.createRelationshipAttribute({
            owner: this.context.accountController.identity.address
        });
        this.context.fillTestIdentitiesOfObject(relationshipAttribute);

        return await this.context.consumptionController.attributes.createSharedLocalAttribute({
            content: relationshipAttribute,
            requestReference: CoreId.from("reqRef"),
            peer: CoreAddress.from("peer")
        });
    }

    public async iCreateAThirdPartyRelationshipAttribute(relationshipAttribute?: RelationshipAttribute): Promise<void> {
        relationshipAttribute ??= TestObjectFactory.createRelationshipAttribute({
            owner: this.context.accountController.identity.address
        });
        this.context.fillTestIdentitiesOfObject(relationshipAttribute);

        await this.context.consumptionController.attributes.createSharedLocalAttribute({
            content: relationshipAttribute,
            requestReference: CoreId.from("reqRef"),
            peer: CoreAddress.from("peer"),
            thirdPartyAddress: CoreAddress.from("AThirdParty")
        });
    }

    public async iMarkMyAttributeAsToBeDeleted(attribute: LocalAttribute): Promise<void> {
        this.context.fillTestIdentitiesOfObject(attribute);

        attribute.deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted, deletionDate: CoreDate.utc().add({ minutes: 5 }) });

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
