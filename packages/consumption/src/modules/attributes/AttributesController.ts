import { EventBus } from "@js-soft/ts-utils";
import {
    AbstractAttributeValue,
    AbstractComplexValue,
    AttributeValues,
    IdentityAttribute,
    IdentityAttributeQuery,
    IIdentityAttributeQuery,
    IIQLQuery,
    IQLQuery,
    IRelationshipAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    RelationshipAttribute,
    RelationshipAttributeJSON,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryOwner
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import * as iql from "@nmshd/iql";
import { SynchronizedCollection, TagClient, TransportCoreErrors } from "@nmshd/transport";
import _ from "lodash";
import { nameof } from "ts-simple-nameof";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { ConsumptionCoreErrors } from "../../consumption/ConsumptionCoreErrors";
import { ConsumptionError } from "../../consumption/ConsumptionError";
import { ConsumptionIds } from "../../consumption/ConsumptionIds";
import { flattenObject, ValidationResult } from "../common";
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    OwnSharedAttributeSucceededEvent,
    RepositoryAttributeSucceededEvent,
    SharedAttributeCopyCreatedEvent,
    ThirdPartyRelationshipAttributeSucceededEvent
} from "./events";
import { AttributeSuccessorParams, AttributeSuccessorParamsJSON, IAttributeSuccessorParams } from "./local/AttributeSuccessorParams";
import { AttributeTagCollection, IAttributeTag } from "./local/AttributeTagCollection";
import { CreateRepositoryAttributeParams, ICreateRepositoryAttributeParams } from "./local/CreateRepositoryAttributeParams";
import { CreateSharedLocalAttributeCopyParams, ICreateSharedLocalAttributeCopyParams } from "./local/CreateSharedLocalAttributeCopyParams";
import { CreateSharedLocalAttributeParams, ICreateSharedLocalAttributeParams } from "./local/CreateSharedLocalAttributeParams";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./local/LocalAttribute";
import { LocalAttributeDeletionStatus } from "./local/LocalAttributeDeletionInfo";
import { LocalAttributeShareInfo } from "./local/LocalAttributeShareInfo";
import { IdentityAttributeQueryTranslator, RelationshipAttributeQueryTranslator, ThirdPartyRelationshipAttributeQueryTranslator } from "./local/QueryTranslator";

export class AttributesController extends ConsumptionBaseController {
    private static readonly TAG_SEPARATOR = "+%+";

    private attributes: SynchronizedCollection;
    private attributeTagClient: TagClient;

    public constructor(
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress },
        private readonly setDefaultRepositoryAttributes: boolean
    ) {
        super(ConsumptionControllerName.AttributesController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.attributes = await this.parent.accountController.getSynchronizedCollection("Attributes");
        this.attributeTagClient = new TagClient(this.parent.transport.config, this.parent.accountController.authenticator, this.parent.transport.correlator);

        return this;
    }

    public async getLocalAttribute(id: CoreId): Promise<LocalAttribute | undefined> {
        const result = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: id.toString()
        });

        if (!result) return;
        return LocalAttribute.from(result);
    }

    public async getLocalAttributes(query?: any, hideTechnical = false, onlyValid = false): Promise<LocalAttribute[]> {
        const enrichedQuery = this.enrichQuery(query, hideTechnical);
        const attributes = await this.attributes.find(enrichedQuery);
        const parsed = this.parseArray(attributes, LocalAttribute);
        if (!onlyValid) return parsed;

        const sorted = parsed.sort((a, b) => {
            return a.createdAt.compare(b.createdAt);
        });

        return sorted;
    }

    private enrichQuery(query: any, hideTechnical: boolean) {
        if (!hideTechnical) return query;

        const hideTechnicalQuery = {
            $or: [
                {
                    [`${nameof<LocalAttributeJSON>((c) => c.content)}.@type`]: "IdentityAttribute"
                },
                {
                    $and: [
                        {
                            [`${nameof<LocalAttributeJSON>((c) => c.content)}.@type`]: "RelationshipAttribute"
                        },
                        {
                            [`${nameof<LocalAttributeJSON>((c) => c.content)}.${nameof<RelationshipAttributeJSON>((c) => c.isTechnical)}`]: false
                        }
                    ]
                }
            ]
        };

        if (!query) return hideTechnicalQuery;

        return { $and: [query, hideTechnicalQuery] };
    }

    public async getValidLocalAttributes(query?: any, hideTechnical = false): Promise<LocalAttribute[]> {
        return await this.getLocalAttributes(query, hideTechnical, true);
    }

    public async executeIQLQuery(query: IIQLQuery): Promise<LocalAttribute[]> {
        /* Fetch subset of attributes relevant for IQL queries. We filter for
         * identity attributes which are not shared. */
        const envelopedAttributes: any[] = await this.attributes.find({
            "content.@type": "IdentityAttribute",
            shareInfo: {
                $exists: false
            }
        });

        /* Remove envelope from attributes and execute query. IQL makes no use
         * of the envelope data. */
        const attributes: iql.AttributeView[] = envelopedAttributes.map((e) => {
            return e.content;
        }) as iql.AttributeView[];
        const indices = iql.execute(query.queryString, attributes);

        /* Map matched indices back to their respective attributes and return. */
        const matchedAttributes = indices.map((ii) => envelopedAttributes[ii]);
        const result = this.parseArray(matchedAttributes, LocalAttribute);
        return result;
    }

    public async executeRelationshipAttributeQuery(query: IRelationshipAttributeQuery): Promise<LocalAttribute | undefined> {
        const parsedQuery = RelationshipAttributeQuery.from(query);

        const dbQuery = RelationshipAttributeQueryTranslator.translate(parsedQuery);
        dbQuery["content.confidentiality"] = { $ne: "private" };

        if (parsedQuery.owner.equals("")) {
            dbQuery["content.owner"] = { $eq: this.identity.address.toString() };
        }

        const attributes = await this.attributes.find(dbQuery);
        const attribute = attributes.length > 0 ? LocalAttribute.from(attributes[0]) : undefined;

        return attribute;
    }

    public async executeThirdPartyRelationshipAttributeQuery(query: IThirdPartyRelationshipAttributeQuery): Promise<LocalAttribute[]> {
        const parsedQuery = ThirdPartyRelationshipAttributeQuery.from(query);

        let dbQuery = ThirdPartyRelationshipAttributeQueryTranslator.translate(parsedQuery);
        dbQuery["content.confidentiality"] = { $ne: "private" };

        switch (parsedQuery.owner) {
            case ThirdPartyRelationshipAttributeQueryOwner.Recipient:
                dbQuery["content.owner"] = { $eq: this.identity.address.toString() };
                break;
            case ThirdPartyRelationshipAttributeQueryOwner.ThirdParty:
                dbQuery["content.owner"] = { $in: parsedQuery.thirdParty.map((aThirdParty) => aThirdParty.toString()) };
                break;
            case ThirdPartyRelationshipAttributeQueryOwner.Empty:
                const recipientOrThirdPartyIsOwnerQuery = {
                    $or: [
                        {
                            ["content.owner"]: { $eq: this.identity.address.toString() }
                        },
                        {
                            ["content.owner"]: { $in: parsedQuery.thirdParty.map((aThirdParty) => aThirdParty.toString()) }
                        }
                    ]
                };
                dbQuery = { $and: [dbQuery, recipientOrThirdPartyIsOwnerQuery] };
                break;
        }

        const attributes = await this.attributes.find(dbQuery);

        return this.parseArray(attributes, LocalAttribute);
    }

    public async executeIdentityAttributeQuery(query: IIdentityAttributeQuery): Promise<LocalAttribute[]> {
        const parsedQuery = IdentityAttributeQuery.from(query);
        const dbQuery = IdentityAttributeQueryTranslator.translate(parsedQuery);
        dbQuery["content.owner"] = this.identity.address.toString();
        dbQuery["shareInfo"] = { $exists: false };

        const attributes = await this.attributes.find(dbQuery);

        return this.parseArray(attributes, LocalAttribute);
    }

    public async createRepositoryAttribute(params: ICreateRepositoryAttributeParams): Promise<LocalAttribute> {
        if (params.content.owner.toString() !== this.identity.address.toString()) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfRepositoryAttribute();
        }

        const parsedParams = CreateRepositoryAttributeParams.from(params);

        const tagValidationResult = await this.validateTags(parsedParams.content);
        if (tagValidationResult.isError()) {
            throw tagValidationResult.error;
        }

        let localAttribute = LocalAttribute.from({
            id: parsedParams.id ?? (await ConsumptionIds.attribute.generate()),
            createdAt: CoreDate.utc(),
            content: parsedParams.content,
            parentId: parsedParams.parentId
        });

        await this.attributes.create(localAttribute);

        if (this.setDefaultRepositoryAttributes) {
            localAttribute = await this.setAsDefaultRepositoryAttribute(localAttribute, true);
        }

        if (localAttribute.content.value instanceof AbstractComplexValue) {
            await this.createLocalAttributesForChildrenOfComplexAttribute(localAttribute);
        }

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), localAttribute));

        return localAttribute;
    }

    private async createLocalAttributesForChildrenOfComplexAttribute(localAttribute: LocalAttribute): Promise<void> {
        if (!(localAttribute.content instanceof IdentityAttribute)) {
            throw new ConsumptionError("Only IdentityAttributes may have child Attributes.");
        }

        const childAttributeValues = Object.values(localAttribute.content.value).filter((p) => p instanceof AbstractAttributeValue) as AttributeValues.Identity.Class[];

        for (const propertyValue of childAttributeValues) {
            const childAttribute = IdentityAttribute.from({
                ...localAttribute.content.toJSON(),
                value: propertyValue.toJSON() as AttributeValues.Identity.Json
            });

            await this.createRepositoryAttribute({
                content: childAttribute,
                parentId: localAttribute.id
            });
        }
    }

    public async setAsDefaultRepositoryAttribute(newDefaultAttribute: LocalAttribute, skipOverwrite?: boolean): Promise<LocalAttribute> {
        if (!this.setDefaultRepositoryAttributes) throw ConsumptionCoreErrors.attributes.setDefaultRepositoryAttributesIsDisabled();

        if (!newDefaultAttribute.isRepositoryAttribute(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.isNotRepositoryAttribute(newDefaultAttribute.id);
        }

        if (newDefaultAttribute.isDefault) return newDefaultAttribute;

        if (newDefaultAttribute.parentId) {
            const parentAttribute = await this.getLocalAttribute(newDefaultAttribute.parentId);
            if (!parentAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, newDefaultAttribute.parentId.toString());
            if (parentAttribute.isDefault) skipOverwrite = false;
        }

        const valueType = newDefaultAttribute.content.value.constructor.name;
        const query = {
            $and: [
                {
                    [`${nameof<LocalAttribute>((c) => c.content)}.value.@type`]: valueType
                },
                {
                    [nameof<LocalAttribute>((c) => c.isDefault)]: true
                }
            ]
        };

        const currentDefaultAttributeResult = await this.getLocalAttributes(query);

        if (currentDefaultAttributeResult.length > 1) {
            throw new ConsumptionError(`There are multiple default Attributes for type ${valueType.toString()}, even though only one is expected.`);
        }

        const currentDefaultAttributeExists = currentDefaultAttributeResult.length === 1;
        if (skipOverwrite && currentDefaultAttributeExists) return newDefaultAttribute;

        if (!skipOverwrite && currentDefaultAttributeExists) {
            const currentDefaultAttribute = currentDefaultAttributeResult[0];
            currentDefaultAttribute.isDefault = undefined;
            await this.updateAttributeUnsafe(currentDefaultAttribute);
        }

        newDefaultAttribute.isDefault = true;
        await this.updateAttributeUnsafe(newDefaultAttribute);
        return newDefaultAttribute;
    }

    public async createSharedLocalAttributeCopy(params: ICreateSharedLocalAttributeCopyParams): Promise<LocalAttribute> {
        const parsedParams = CreateSharedLocalAttributeCopyParams.from(params);
        const sourceAttribute = await this.getLocalAttribute(parsedParams.sourceAttributeId);
        if (!sourceAttribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.sourceAttributeId.toString());
        }

        const shareInfo = LocalAttributeShareInfo.from({
            peer: parsedParams.peer,
            requestReference: parsedParams.requestReference,
            sourceAttribute: parsedParams.sourceAttributeId,
            thirdPartyAddress: sourceAttribute.shareInfo?.peer
        });

        const sharedLocalAttributeCopy = await LocalAttribute.fromAttribute(sourceAttribute.content, undefined, shareInfo, parsedParams.attributeId);
        await this.attributes.create(sharedLocalAttributeCopy);

        this.eventBus.publish(new SharedAttributeCopyCreatedEvent(this.identity.address.toString(), sharedLocalAttributeCopy));
        return sharedLocalAttributeCopy;
    }

    public async createSharedLocalAttribute(params: ICreateSharedLocalAttributeParams): Promise<LocalAttribute> {
        const parsedParams = CreateSharedLocalAttributeParams.from(params);
        const tagValidationResult = await this.validateTags(parsedParams.content);
        if (tagValidationResult.isError()) {
            throw tagValidationResult.error;
        }

        const shareInfo = LocalAttributeShareInfo.from({
            peer: params.peer,
            requestReference: params.requestReference,
            thirdPartyAddress: params.thirdPartyAddress
        });
        const peerLocalAttribute = LocalAttribute.from({
            id: params.id ?? (await ConsumptionIds.attribute.generate()),
            content: params.content,
            shareInfo: shareInfo,
            createdAt: CoreDate.utc()
        });
        await this.attributes.create(peerLocalAttribute);
        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), peerLocalAttribute));
        return peerLocalAttribute;
    }

    public async deleteAttribute(attribute: LocalAttribute): Promise<void> {
        if (attribute.content instanceof IdentityAttribute && attribute.content.value instanceof AbstractComplexValue) {
            await this.deleteChildAttributesOfComplexAttribute(attribute);
        }

        await this.deleteAttributeUnsafe(attribute.id);

        this.eventBus.publish(new AttributeDeletedEvent(this.identity.address.toString(), attribute));
    }

    public async deleteAttributesExchangedWithPeer(peer: CoreAddress): Promise<void> {
        const attributes = await this.getLocalAttributes({ "shareInfo.peer": peer.toString() });
        for (const attribute of attributes) {
            await this.deleteAttributeUnsafe(attribute.id);
        }
    }

    private async deleteChildAttributesOfComplexAttribute(complexAttribute: LocalAttribute): Promise<void> {
        if (!(complexAttribute.content instanceof IdentityAttribute)) {
            throw new ConsumptionError("Only IdentityAttributes may have child Attributes.");
        }

        const childAttributes = await this.getLocalAttributes({ parentId: complexAttribute.id.toString() });
        for (const childAttribute of childAttributes) {
            await this.deleteAttribute(childAttribute);
        }
    }

    public async succeedRepositoryAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateRepositoryAttributeSuccession(predecessorId, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        });

        if (predecessor.isComplexAttribute()) {
            await this.succeedChildrenOfComplexAttribute(successor.id);
        }

        this.eventBus.publish(new RepositoryAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));

        return { predecessor, successor };
    }

    public async succeedOwnSharedIdentityAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateOwnSharedIdentityAttributeSuccession(predecessorId, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        });

        this.eventBus.publish(new OwnSharedAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));

        return { predecessor, successor };
    }

    public async succeedOwnSharedRelationshipAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateOwnSharedRelationshipAttributeSuccession(predecessorId, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        });

        this.eventBus.publish(new OwnSharedAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));

        return { predecessor, successor };
    }

    public async succeedPeerSharedIdentityAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validatePeerSharedIdentityAttributeSuccession(predecessorId, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        });

        /* No succeeded attribute event fired here. This is done by the notification system. */

        return { predecessor, successor };
    }

    public async succeedPeerSharedRelationshipAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validatePeerSharedRelationshipAttributeSuccession(predecessorId, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        });

        /* No succeeded attribute event fired here. This is done by the notification system. */

        return { predecessor, successor };
    }

    public async succeedThirdPartyRelationshipAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateThirdPartyRelationshipAttributeSuccession(predecessorId, parsedSuccessorParams);
            if (validationResult.isError()) {
                throw validationResult.error;
            }
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        });

        this.eventBus.publish(new ThirdPartyRelationshipAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));

        return { predecessor, successor };
    }

    private async succeedChildrenOfComplexAttribute(parentSuccessorId: CoreId) {
        const parentSuccessor = await this.getLocalAttribute(parentSuccessorId);
        if (!parentSuccessor) throw ConsumptionCoreErrors.attributes.invalidParentSuccessor(parentSuccessorId);

        const childAttributeValues: AbstractAttributeValue[] = Object.values(parentSuccessor.content.value).filter((elem) => elem instanceof AbstractAttributeValue);

        for (const childAttributeValue of childAttributeValues) {
            let currentParent = await this.getLocalAttribute(parentSuccessorId);

            let child;
            while (!child && currentParent?.succeeds) {
                const currentPredecessor = (await this.getLocalAttribute(currentParent.succeeds))!;
                currentParent = currentPredecessor;
                child = await this.getChildAttributesByValueType(currentParent.id, childAttributeValue.constructor);
            }

            const childPredecessorId = child?.id;
            if (childPredecessorId) {
                await this._succeedAttributeUnsafe(childPredecessorId, {
                    content: IdentityAttribute.from({
                        value: childAttributeValue.toJSON() as AttributeValues.Identity.Json,
                        owner: this.identity.address
                    }),
                    parentId: parentSuccessorId,
                    createdAt: parentSuccessor.createdAt
                });
            } else {
                await this.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: childAttributeValue.toJSON() as AttributeValues.Identity.Json,
                        owner: this.identity.address
                    }),
                    parentId: parentSuccessorId,
                    createdAt: parentSuccessor.createdAt
                });
            }
        }
    }

    private async getChildAttributesByValueType(parentId: CoreId, valueType: AbstractAttributeValue["constructor"]): Promise<LocalAttribute | undefined> {
        const children = await this.getLocalAttributes({
            parentId: parentId.toString()
        });

        /** We currently assume that all of the child attributes of a complex
         * attribute have distinct types. */
        return children.find((elem) => elem.content.value instanceof valueType);
    }

    private async _succeedAttributeUnsafe(
        predecessorId: CoreId,
        successorParams: Parameters<typeof this.createAttributeUnsafe>[0]
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const predecessor = await this.getLocalAttribute(predecessorId);
        if (!predecessor) throw ConsumptionCoreErrors.attributes.predecessorDoesNotExist();

        const successor = await this.createAttributeUnsafe({
            id: successorParams.id,
            content: successorParams.content,
            succeeds: predecessorId,
            shareInfo: successorParams.shareInfo,
            parentId: successorParams.parentId,
            createdAt: successorParams.createdAt,
            succeededBy: successorParams.succeededBy,
            isDefault: predecessor.isDefault
        });

        await this.removeDefault(predecessor);

        predecessor.succeededBy = successor.id;
        await this.updateAttributeUnsafe(predecessor);

        return { predecessor, successor };
    }

    private async removeDefault(attribute: LocalAttribute): Promise<LocalAttribute> {
        if (!attribute.isDefault) return attribute;

        attribute.isDefault = undefined;
        await this.updateAttributeUnsafe(attribute);
        return attribute;
    }

    public async validateRepositoryAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams);
        if (commonValidation.isError()) return commonValidation;

        const predecessor = (await this.getLocalAttribute(predecessorId))!;

        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (!predecessor.isRepositoryAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorIsNotRepositoryAttribute());
        }

        if (!successor.isRepositoryAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotRepositoryAttribute());
        }

        return ValidationResult.success();
    }

    public async validateOwnSharedIdentityAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams);
        if (commonValidation.isError()) return commonValidation;

        const predecessor = (await this.getLocalAttribute(predecessorId))!;
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (!predecessor.isOwnSharedIdentityAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorIsNotOwnSharedIdentityAttribute());
        }

        if (!successor.isOwnSharedIdentityAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotOwnSharedIdentityAttribute());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangePeer());
        }

        if (!successor.shareInfo.sourceAttribute) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorSourceAttributeIsNotSpecified());
        }

        const successorSource = await this.getLocalAttribute(successor.shareInfo.sourceAttribute);
        if (!successorSource) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorSourceAttributeDoesNotExist());
        }

        if (!successorSource.isRepositoryAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorSourceAttributeIsNotRepositoryAttribute());
        }

        if (!_.isEqual(successorSource.content.toJSON(), successor.content.toJSON())) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorSourceContentIsNotEqualToCopyContent());
        }

        const predecessorSource = predecessor.shareInfo.sourceAttribute ? await this.getLocalAttribute(predecessor.shareInfo.sourceAttribute) : undefined;
        if (predecessorSource) {
            if (!predecessorSource.isRepositoryAttribute(this.identity.address)) {
                return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorSourceAttributeIsNotRepositoryAttribute());
            }

            const successorSourceVersionIds = (await this.getVersionsOfAttribute(successorSource.id)).map((x) => x.id.toString());
            if (!predecessorSource.succeededBy || !successorSourceVersionIds.some((id) => id === predecessorSource.succeededBy?.toString())) {
                return ValidationResult.error(ConsumptionCoreErrors.attributes.successorSourceDoesNotSucceedPredecessorSource());
            }

            if (!_.isEqual(predecessorSource.content.toJSON(), predecessor.content.toJSON())) {
                return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorSourceContentIsNotEqualToCopyContent());
            }
        }

        return ValidationResult.success();
    }

    public async validateOwnSharedRelationshipAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams);
        if (commonValidation.isError()) return commonValidation;

        const predecessor = (await this.getLocalAttribute(predecessorId))!;
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (!predecessor.isOwnSharedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorIsNotOwnSharedRelationshipAttribute());
        }

        if (!successor.isOwnSharedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotOwnSharedRelationshipAttribute());
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeKey());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangePeer());
        }

        return ValidationResult.success();
    }

    public async validatePeerSharedIdentityAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams);
        if (commonValidation.isError()) return commonValidation;

        const predecessor = (await this.getLocalAttribute(predecessorId))!;
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (!predecessor.isPeerSharedIdentityAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorIsNotPeerSharedIdentityAttribute());
        }

        if (!successor.isPeerSharedIdentityAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotPeerSharedIdentityAttribute());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangePeer());
        }

        return ValidationResult.success();
    }

    public async validatePeerSharedRelationshipAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams);
        if (commonValidation.isError()) return commonValidation;

        const predecessor = (await this.getLocalAttribute(predecessorId))!;
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (!predecessor.isPeerSharedRelationshipAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorIsNotPeerSharedRelationshipAttribute());
        }

        if (!successor.isPeerSharedRelationshipAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotPeerSharedRelationshipAttribute());
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeKey());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangePeer());
        }

        return ValidationResult.success();
    }

    public async validateThirdPartyRelationshipAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams);
        if (commonValidation.isError()) return commonValidation;

        const predecessor = (await this.getLocalAttribute(predecessorId))!;
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (!predecessor.isThirdPartyRelationshipAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorIsNotThirdPartyRelationshipAttribute());
        }

        if (!successor.isThirdPartyRelationshipAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotThirdPartyRelationshipAttribute());
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeKey());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangePeer());
        }

        if (!predecessor.shareInfo.thirdPartyAddress.equals(successor.shareInfo.thirdPartyAddress)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeThirdParty());
        }

        return ValidationResult.success();
    }

    public async validateAttributeSuccessionCommon(predecessorId: CoreId, successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const tagValidationResult = await this.validateTags(parsedSuccessorParams.content);
        if (tagValidationResult.isError()) {
            throw tagValidationResult.error;
        }

        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        });

        if (parsedSuccessorParams.id) {
            const successor = await this.getLocalAttribute(CoreId.from(parsedSuccessorParams.id));
            if (successor) return ValidationResult.error(ConsumptionCoreErrors.attributes.successorMustNotYetExist());
        }

        if (successor.succeededBy) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorMustNotHaveASuccessor());
        }

        if (successor.parentId) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedChildOfComplexAttribute(predecessorId.toString()));
        }

        const predecessor = await this.getLocalAttribute(predecessorId);
        if (!predecessor) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorDoesNotExist());
        }

        if (predecessor.succeededBy) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedAttributesWithASuccessor(predecessor.succeededBy.toString()));
        }

        if (predecessor.parentId) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedChildOfComplexAttribute(predecessorId.toString()));
        }

        if (
            predecessor.hasDeletionInfo() &&
            !(
                predecessor.deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletionRequestRejected ||
                predecessor.deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletionRequestSent
            )
        ) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedAttributesWithDeletionInfo());
        }

        if (_.isEqual(successor.content.toJSON(), predecessor.content.toJSON())) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustChangeContent());
        }

        if (!predecessor.content.owner.equals(CoreAddress.from(successor.content.owner))) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeOwner());
        }

        if (successor.content.constructor !== predecessor.content.constructor) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeContentType());
        }

        if (predecessor.content.value.constructor !== successor.content.value.constructor) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeValueType());
        }

        if (successor.succeeds && !predecessorId.equals(successor.succeeds.toString())) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.setPredecessorIdDoesNotMatchActualPredecessorId());
        }

        return ValidationResult.success();
    }

    public async createAttributeUnsafe(attributeData: Omit<ILocalAttribute, "id" | "createdAt"> & { id?: ICoreId; createdAt?: ICoreDate }): Promise<LocalAttribute> {
        const localAttribute = LocalAttribute.from({
            id: attributeData.id ?? (await ConsumptionIds.attribute.generate()),
            content: attributeData.content,
            createdAt: attributeData.createdAt ?? CoreDate.utc(),
            shareInfo: attributeData.shareInfo,
            parentId: attributeData.parentId,
            succeededBy: attributeData.succeededBy,
            succeeds: attributeData.succeeds,
            deletionInfo: attributeData.deletionInfo,
            isDefault: attributeData.isDefault
        });
        await this.attributes.create(localAttribute);
        return localAttribute;
    }

    public async updateAttributeUnsafe(attributeParams: ILocalAttribute): Promise<LocalAttribute> {
        const doc = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: attributeParams.id.toString()
        });
        if (!doc) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attributeParams.id.toString());
        }

        const params: ILocalAttribute = {
            id: attributeParams.id,
            content: attributeParams.content,
            createdAt: attributeParams.createdAt,
            parentId: attributeParams.parentId,
            shareInfo: attributeParams.shareInfo,
            succeededBy: attributeParams.succeededBy,
            succeeds: attributeParams.succeeds,
            deletionInfo: attributeParams.deletionInfo,
            isDefault: attributeParams.isDefault
        };
        const newAttribute = LocalAttribute.from(params);
        await this.attributes.update(doc, newAttribute);
        return newAttribute;
    }

    public async deleteAttributeUnsafe(id: CoreId): Promise<void> {
        await this.attributes.delete({ id: id });
    }

    public async executeFullAttributeDeletionProcess(attribute: LocalAttribute): Promise<void> {
        const validationResult = await this.validateFullAttributeDeletionProcess(attribute);
        if (validationResult.isError()) throw validationResult.error;

        const childAttributes = await this.getLocalAttributes({ parentId: attribute.id.toString() });
        const parentAndChildAttributes = [attribute, ...childAttributes];
        for (const attr of parentAndChildAttributes) {
            if (attr.succeededBy) {
                const successor = await this.getLocalAttribute(attr.succeededBy);
                if (!successor) {
                    throw ConsumptionCoreErrors.attributes.successorDoesNotExist();
                }
                await this.detachSuccessor(successor);
            }
        }

        const copiesOfParentAndChildAttributes = await this.getLocalAttributes({
            ["shareInfo.sourceAttribute"]: { $in: parentAndChildAttributes.map((attribute) => attribute.id.toString()) }
        });
        const predecessorCopiesOfParentAndChildAttributes = [];
        for (const attr of parentAndChildAttributes) {
            const predecessorCopies = await this.getSharedPredecessorsOfAttribute(attr);
            predecessorCopiesOfParentAndChildAttributes.push(...predecessorCopies);
        }
        const attributeCopiesToDetach = [...copiesOfParentAndChildAttributes, ...predecessorCopiesOfParentAndChildAttributes];
        await this.detachAttributeCopies(attributeCopiesToDetach);

        await this.deletePredecessorsOfAttribute(attribute.id);

        if (this.setDefaultRepositoryAttributes) {
            await this.transferDefault(attribute);
        }

        await this.deleteAttribute(attribute);
    }

    public async validateFullAttributeDeletionProcess(attribute: LocalAttribute): Promise<ValidationResult> {
        const childAttributes = await this.getLocalAttributes({ parentId: attribute.id.toString() });
        const parentAndChildAttributes = [attribute, ...childAttributes];
        for (const attr of parentAndChildAttributes) {
            const validateSuccessorResult = await this.validateSuccessor(attr);
            if (validateSuccessorResult.isError()) {
                return validateSuccessorResult;
            }
        }

        const copiesOfParentAndChildAttributes = await this.getLocalAttributes({
            ["shareInfo.sourceAttribute"]: { $in: parentAndChildAttributes.map((attribute) => attribute.id.toString()) }
        });
        const predecessorCopiesOfParentAndChildAttributes = [];
        for (const attr of parentAndChildAttributes) {
            const predecessorCopies = await this.getSharedPredecessorsOfAttribute(attr);
            predecessorCopiesOfParentAndChildAttributes.push(...predecessorCopies);
        }
        const attributeCopiesToDetach = [...copiesOfParentAndChildAttributes, ...predecessorCopiesOfParentAndChildAttributes];

        const validateSharedAttributesResult = this.validateSharedAttributes(attributeCopiesToDetach);
        return validateSharedAttributesResult;
    }

    private async validateSuccessor(predecessor: LocalAttribute): Promise<ValidationResult> {
        if (predecessor.succeededBy) {
            const successor = await this.getLocalAttribute(predecessor.succeededBy);
            if (!successor) {
                return ValidationResult.error(ConsumptionCoreErrors.attributes.successorDoesNotExist());
            }
        }
        return ValidationResult.success();
    }

    private validateSharedAttributes(sharedAttributes: LocalAttribute[]): ValidationResult {
        for (const sharedAttribute of sharedAttributes) {
            if (!sharedAttribute.isShared()) {
                return ValidationResult.error(ConsumptionCoreErrors.attributes.isNotSharedAttribute(sharedAttribute.id));
            }
        }
        return ValidationResult.success();
    }

    private async detachSuccessor(successor: LocalAttribute): Promise<void> {
        successor.succeeds = undefined;
        await this.updateAttributeUnsafe(successor);
    }

    private async detachAttributeCopies(sharedAttributes: LocalAttribute[]): Promise<void> {
        for (const sharedAttribute of sharedAttributes) {
            if (!sharedAttribute.isShared()) {
                throw ConsumptionCoreErrors.attributes.isNotSharedAttribute(sharedAttribute.id);
            }
            sharedAttribute.shareInfo.sourceAttribute = undefined;
            await this.updateAttributeUnsafe(sharedAttribute);
        }
    }

    private async deletePredecessorsOfAttribute(attributeId: CoreId): Promise<void> {
        const predecessors = await this.getPredecessorsOfAttribute(attributeId);
        for (const predecessor of predecessors) {
            await this.deleteAttribute(predecessor);
        }
    }

    private async transferDefault(attribute: LocalAttribute): Promise<void> {
        if (!this.setDefaultRepositoryAttributes) throw ConsumptionCoreErrors.attributes.setDefaultRepositoryAttributesIsDisabled();
        if (!attribute.isDefault) return;

        const valueType = attribute.content.value.constructor.name;
        const query = {
            $and: [
                {
                    [`${nameof<LocalAttribute>((c) => c.content)}.value.@type`]: valueType
                },
                {
                    [nameof<LocalAttribute>((c) => c.succeededBy)]: undefined
                },
                {
                    [nameof<LocalAttribute>((c) => c.id)]: { $ne: attribute.id.toString() }
                }
            ]
        };

        const defaultCandidates = await this.getLocalAttributes(query);
        if (defaultCandidates.length === 0) return;

        defaultCandidates[defaultCandidates.length - 1].isDefault = true;
        await this.updateAttributeUnsafe(defaultCandidates[defaultCandidates.length - 1]);
    }

    public async getVersionsOfAttribute(id: CoreId): Promise<LocalAttribute[]> {
        const attribute = await this.getLocalAttribute(id);
        if (!attribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString());
        }

        const predecessors = await this.getPredecessorsOfAttribute(id);
        const successors = await this.getSuccessorsOfAttribute(id);

        const allAttributeVersions = [...successors.reverse(), attribute, ...predecessors];

        return allAttributeVersions;
    }

    public async getPredecessorsOfAttribute(id: CoreId): Promise<LocalAttribute[]> {
        let attribute = await this.getLocalAttribute(id);
        if (!attribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString());
        }

        const predecessors: LocalAttribute[] = [];
        while (attribute.succeeds) {
            const predecessor = await this.getLocalAttribute(attribute.succeeds);
            if (!predecessor) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeeds.toString());
            }

            attribute = predecessor;
            predecessors.push(attribute);
        }

        return predecessors;
    }

    public async getSuccessorsOfAttribute(id: CoreId): Promise<LocalAttribute[]> {
        let attribute = await this.getLocalAttribute(id);
        if (!attribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString());
        }

        const successors: LocalAttribute[] = [];
        while (attribute.succeededBy) {
            const successor = await this.getLocalAttribute(attribute.succeededBy);
            if (!successor) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeededBy.toString());
            }

            attribute = successor;
            successors.push(successor);
        }

        return successors;
    }

    public async isSubsequentInSuccession(predecessor: LocalAttribute, successor: LocalAttribute): Promise<boolean> {
        while (predecessor.succeededBy) {
            const directSuccessor = await this.getLocalAttribute(predecessor.succeededBy);
            if (!directSuccessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, predecessor.succeededBy.toString());

            if (predecessor.succeededBy.toString() === successor.id.toString()) return true;

            predecessor = directSuccessor;
        }
        return false;
    }

    public async getSharedVersionsOfAttribute(id: CoreId, peers?: CoreAddress[], onlyLatestVersions = true, query: any = {}): Promise<LocalAttribute[]> {
        const sourceAttribute = await this.getLocalAttribute(id);
        if (!sourceAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString());

        query["shareInfo.sourceAttribute"] = sourceAttribute.id.toString();
        if (peers) query["shareInfo.peer"] = { $in: peers.map((address) => address.toString()) };
        if (onlyLatestVersions) query["succeededBy"] = { $exists: false };

        const ownSharedAttributes = await this.getLocalAttributes(query);
        const ownSharedAttributePredecessors = await this.getSharedPredecessorsOfAttribute(sourceAttribute, query);
        const ownSharedAttributeSuccessors = await this.getSharedSuccessorsOfAttribute(sourceAttribute, query);

        const ownSharedAttributeVersions = [...ownSharedAttributeSuccessors.reverse(), ...ownSharedAttributes, ...ownSharedAttributePredecessors];
        return ownSharedAttributeVersions;
    }

    public async getSharedPredecessorsOfAttribute(sourceAttribute: LocalAttribute, query: any = {}): Promise<LocalAttribute[]> {
        const ownSharedAttributePredecessors: LocalAttribute[] = [];
        while (sourceAttribute.succeeds) {
            const predecessor = await this.getLocalAttribute(sourceAttribute.succeeds);
            if (!predecessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, sourceAttribute.succeeds.toString());

            sourceAttribute = predecessor;

            query["shareInfo.sourceAttribute"] = sourceAttribute.id.toString();
            const sharedCopies = await this.getLocalAttributes(query);

            ownSharedAttributePredecessors.push(...sharedCopies);
        }

        return ownSharedAttributePredecessors;
    }

    public async getSharedSuccessorsOfAttribute(sourceAttribute: LocalAttribute, query: any = {}): Promise<LocalAttribute[]> {
        const ownSharedAttributeSuccessors: LocalAttribute[] = [];
        while (sourceAttribute.succeededBy) {
            const successor = await this.getLocalAttribute(sourceAttribute.succeededBy);
            if (!successor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, sourceAttribute.succeededBy.toString());

            sourceAttribute = successor;

            query["shareInfo.sourceAttribute"] = sourceAttribute.id.toString();
            const sharedCopies = await this.getLocalAttributes(query);

            ownSharedAttributeSuccessors.push(...sharedCopies);
        }

        return ownSharedAttributeSuccessors;
    }

    public async getRepositoryAttributeWithSameValue(value: AttributeValues.Identity.Json): Promise<LocalAttribute | undefined> {
        const queryForRepositoryAttributeDuplicates = flattenObject({
            content: {
                "@type": "IdentityAttribute",
                owner: this.identity.address.toString(),
                value: value
            }
        });
        queryForRepositoryAttributeDuplicates["succeededBy"] = { $exists: false };
        queryForRepositoryAttributeDuplicates["shareInfo"] = { $exists: false };

        const matchingRepositoryAttributes = await this.getLocalAttributes(queryForRepositoryAttributeDuplicates);

        const repositoryAttributeDuplicate = matchingRepositoryAttributes.find((duplicate) => _.isEqual(duplicate.content.value.toJSON(), value));
        return repositoryAttributeDuplicate;
    }

    public async getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(key: string, owner: CoreAddress, valueType: string, peer: CoreAddress): Promise<LocalAttribute[]> {
        return await this.getLocalAttributes({
            "content.@type": "RelationshipAttribute",
            "content.owner": owner.toString(),
            "content.key": key,
            "content.value.@type": valueType,
            "shareInfo.peer": peer.toString(),
            "shareInfo.thirdPartyAddress": { $exists: false },
            "deletionInfo.deletionStatus": {
                $nin: [
                    LocalAttributeDeletionStatus.ToBeDeleted,
                    LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                    LocalAttributeDeletionStatus.DeletedByPeer,
                    LocalAttributeDeletionStatus.DeletedByOwner
                ]
            }
        });
    }

    public async getAttributeTagCollection(): Promise<AttributeTagCollection> {
        const backboneTagCollection = (await this.attributeTagClient.getTagCollection()).value;
        return AttributeTagCollection.from(backboneTagCollection);
    }

    public async validateTags(attribute: IdentityAttribute | RelationshipAttribute): Promise<ValidationResult> {
        if (attribute instanceof RelationshipAttribute) return ValidationResult.success();
        if (!attribute.tags || attribute.tags.length === 0) return ValidationResult.success();

        const tagCollection = await this.getAttributeTagCollection();
        const invalidTags = [];
        for (const tag of attribute.tags) {
            if (!this.isValidTag(tag, tagCollection.tagsForAttributeValueTypes[attribute.toJSON().value["@type"]])) {
                invalidTags.push(tag);
            }
        }

        if (invalidTags.length > 0) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.invalidTags(invalidTags));
        }

        return ValidationResult.success();
    }

    public async validateAttributeQueryTags(
        attributeQuery: IdentityAttributeQuery | IQLQuery | RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery
    ): Promise<ValidationResult> {
        if (
            (attributeQuery instanceof IQLQuery && !attributeQuery.attributeCreationHints) ||
            attributeQuery instanceof RelationshipAttributeQuery ||
            attributeQuery instanceof ThirdPartyRelationshipAttributeQuery
        ) {
            return ValidationResult.success();
        }

        const attributeTags = attributeQuery instanceof IdentityAttributeQuery ? attributeQuery.tags : attributeQuery.attributeCreationHints!.tags;
        if (!attributeTags || attributeTags.length === 0) return ValidationResult.success();

        const attributeValueType = attributeQuery instanceof IdentityAttributeQuery ? attributeQuery.valueType : attributeQuery.attributeCreationHints!.valueType;
        const tagCollection = await this.getAttributeTagCollection();
        const invalidTags = [];
        for (const tag of attributeTags) {
            if (!this.isValidTag(tag, tagCollection.tagsForAttributeValueTypes[attributeValueType])) {
                invalidTags.push(tag);
            }
        }

        if (invalidTags.length > 0) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.invalidTags(invalidTags));
        }

        return ValidationResult.success();
    }

    private isValidTag(tag: string, validTags: Record<string, IAttributeTag> | undefined): boolean {
        const customTagPrefix = `x${AttributesController.TAG_SEPARATOR}`;

        if (tag.toLowerCase().startsWith(customTagPrefix)) return true;

        const tagParts = tag.split(AttributesController.TAG_SEPARATOR);

        for (const part of tagParts) {
            if (!validTags?.[part]) return false;
            validTags = validTags[part].children;
        }

        return !validTags;
    }
}
