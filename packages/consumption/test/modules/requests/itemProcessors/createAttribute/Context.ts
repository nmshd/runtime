/* eslint-disable jest/no-standalone-expect */
import { CreateAttributeAcceptResponseItem, CreateAttributeRequestItem, RelationshipAttribute, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    ConsumptionIds,
    CreateAttributeRequestItemProcessor,
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

    public givenResponseItem: CreateAttributeAcceptResponseItem;
    public givenRequestItem: CreateAttributeRequestItem;
    public canCreateResult: ValidationResult;
    public canAcceptResult: ValidationResult;
    public peerAddress: CoreAddress;
    public responseItemAfterAction: CreateAttributeAcceptResponseItem;
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
            case TestIdentity.SENDER.toString():
                return this.accountController.identity.address;
            case TestIdentity.RECIPIENT.toString():
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

    public aRequestItemWithAnIdentityAttribute(params: { attributeOwner: CoreAddress }): Promise<void> {
        const attribute = TestObjectFactory.createIdentityAttribute({
            owner: this.context.translateTestIdentity(params.attributeOwner)
        });
        this.context.fillTestIdentitiesOfObject(attribute);

        this.context.givenRequestItem = CreateAttributeRequestItem.from({
            attribute: attribute,
            mustBeAccepted: true
        });
        return Promise.resolve();
    }

    public async aResponseItem(): Promise<void> {
        this.context.givenResponseItem = CreateAttributeAcceptResponseItem.from({
            attributeId: await ConsumptionIds.attribute.generate(),
            result: ResponseItemResult.Accepted
        });
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

    public async aLocalRepositoryAttributeIsCreated(): Promise<void> {
        expect(this.context.responseItemAfterAction.attributeId).toBeDefined();

        const createdSharedAttribute = await this.context.consumptionController.attributes.getLocalAttribute(this.context.responseItemAfterAction.attributeId);

        const createdRepositoryAttribute = await this.context.consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);

        expect(createdRepositoryAttribute).toBeDefined();
        expect(createdRepositoryAttribute!.shareInfo).toBeUndefined();
    }

    public async aLocalIdentityAttributeWithShareInfoForThePeerIsCreated(): Promise<void> {
        expect(this.context.responseItemAfterAction.attributeId).toBeDefined();

        const createdAttribute = await this.context.consumptionController.attributes.getLocalAttribute(this.context.responseItemAfterAction.attributeId);

        expect(createdAttribute).toBeDefined();
        expect(createdAttribute!.shareInfo).toBeDefined();
        expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(this.context.peerAddress.toString());
        expect(createdAttribute!.shareInfo!.sourceAttribute).toBeDefined();
    }

    public async aLocalRelationshipAttributeWithShareInfoForThePeerIsCreated(): Promise<void> {
        expect(this.context.responseItemAfterAction.attributeId).toBeDefined();

        const createdAttribute = await this.context.consumptionController.attributes.getLocalAttribute(this.context.responseItemAfterAction.attributeId);

        expect(createdAttribute).toBeDefined();
        expect(createdAttribute!.shareInfo).toBeDefined();
        expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(this.context.peerAddress.toString());
        expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
    }

    public theCreatedAttributeHasTheAttributeIdFromTheResponseItem(): Promise<void> {
        expect(this.context.createdAttributeAfterAction.id.toString()).toStrictEqual(this.context.givenResponseItem.attributeId.toString());

        return Promise.resolve();
    }

    public theCreatedAttributeHasTheSameContentAsTheAttributeFromTheRequestItem(): Promise<void> {
        expect(this.context.createdAttributeAfterAction.content.toJSON()).toStrictEqual(this.context.givenRequestItem.attribute.toJSON());

        return Promise.resolve();
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

    public async iCallCanCreateOutgoingRequestItemWith(partialRequestItem: Partial<CreateAttributeRequestItem>, recipient: CoreAddress = TestIdentity.RECIPIENT): Promise<void> {
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

        this.context.createdAttributeAfterAction = (await this.context.consumptionController.attributes.getLocalAttribute(this.context.givenResponseItem.attributeId))!;
    }
}
