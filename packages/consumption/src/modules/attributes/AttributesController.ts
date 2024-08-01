import { EventBus } from "@js-soft/ts-utils";
import {
    AbstractAttributeValue,
    AbstractComplexValue,
    AttributeValues,
    IdentityAttribute,
    IdentityAttributeQuery,
    IIdentityAttributeQuery,
    IIQLQuery,
    IRelationshipAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    RelationshipAttributeJSON,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery
} from "@nmshd/content";
import * as iql from "@nmshd/iql";
import { CoreAddress, CoreDate, CoreId, ICoreDate, ICoreId, SynchronizedCollection, CoreErrors as TransportCoreErrors } from "@nmshd/transport";
import _ from "lodash";
import { nameof } from "ts-simple-nameof";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { ConsumptionError } from "../../consumption/ConsumptionError";
import { ConsumptionIds } from "../../consumption/ConsumptionIds";
import { CoreErrors } from "../../consumption/CoreErrors";
import { ValidationResult } from "../common";
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    OwnSharedAttributeSucceededEvent,
    RepositoryAttributeSucceededEvent,
    SharedAttributeCopyCreatedEvent,
    ThirdPartyOwnedRelationshipAttributeSucceededEvent
} from "./events";
import { AttributeSuccessorParams, AttributeSuccessorParamsJSON, IAttributeSuccessorParams } from "./local/AttributeSuccessorParams";
import { CreateLocalAttributeParams, ICreateLocalAttributeParams } from "./local/CreateLocalAttributeParams";
import { ICreatePeerLocalAttributeParams } from "./local/CreatePeerLocalAttributeParams";
import { CreateSharedLocalAttributeCopyParams, ICreateSharedLocalAttributeCopyParams } from "./local/CreateSharedLocalAttributeCopyParams";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./local/LocalAttribute";
import { DeletionStatus } from "./local/LocalAttributeDeletionInfo";
import { LocalAttributeShareInfo } from "./local/LocalAttributeShareInfo";
import { IdentityAttributeQueryTranslator, RelationshipAttributeQueryTranslator, ThirdPartyRelationshipAttributeQueryTranslator } from "./local/QueryTranslator";

export class AttributesController extends ConsumptionBaseController {
    private attributes: SynchronizedCollection;

    public constructor(
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress }
    ) {
        super(ConsumptionControllerName.AttributesController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.attributes = await this.parent.accountController.getSynchronizedCollection("Attributes");

        return this;
    }

    public checkValid(attribute: LocalAttribute): boolean {
        const now = CoreDate.utc();
        if (!attribute.content.validFrom && !attribute.content.validTo) {
            return true;
        } else if (attribute.content.validFrom && !attribute.content.validTo && attribute.content.validFrom.isSameOrBefore(now)) {
            return true;
        } else if (!attribute.content.validFrom && attribute.content.validTo?.isSameOrAfter(now)) {
            return true;
        } else if (attribute.content.validFrom && attribute.content.validTo && attribute.content.validFrom.isSameOrBefore(now) && attribute.content.validTo.isSameOrAfter(now)) {
            return true;
        }
        return false;
    }

    public findCurrent(attributes: LocalAttribute[]): LocalAttribute | undefined {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt);
        });
        let current: LocalAttribute | undefined;
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                current = attribute;
            }
        }
        return current;
    }

    public filterCurrent(attributes: LocalAttribute[]): LocalAttribute[] {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt);
        });

        const items = [];
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                items.push(attribute);
            }
        }
        return items;
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

        return this.filterCurrent(parsed);
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

        const attributes = await this.attributes.find(dbQuery);
        const attribute = attributes.length > 0 ? LocalAttribute.from(attributes[0]) : undefined;

        return attribute;
    }

    public async executeThirdPartyRelationshipAttributeQuery(query: IThirdPartyRelationshipAttributeQuery): Promise<LocalAttribute[]> {
        const parsedQuery = ThirdPartyRelationshipAttributeQuery.from(query);

        const dbQuery = ThirdPartyRelationshipAttributeQueryTranslator.translate(parsedQuery);
        dbQuery["content.confidentiality"] = { $ne: "private" };

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

    public async createLocalAttribute(params: ICreateLocalAttributeParams): Promise<LocalAttribute> {
        const parsedParams = CreateLocalAttributeParams.from(params);
        const localAttribute = LocalAttribute.from({
            id: parsedParams.id ?? (await ConsumptionIds.attribute.generate()),
            createdAt: CoreDate.utc(),
            content: parsedParams.content,
            parentId: parsedParams.parentId,
            succeeds: parsedParams.succeeds,
            shareInfo: parsedParams.shareInfo
        });

        await this.attributes.create(localAttribute);

        if (
            localAttribute.content instanceof IdentityAttribute && // Local Attributes for children should only be created for Identity Attributes
            localAttribute.content.value instanceof AbstractComplexValue
        ) {
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

            await this.createLocalAttribute({
                content: childAttribute,
                parentId: localAttribute.id
            });
        }
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
            sourceAttribute: parsedParams.sourceAttributeId
        });

        const sharedLocalAttributeCopy = await LocalAttribute.fromAttribute(sourceAttribute.content, undefined, shareInfo, parsedParams.attributeId);
        await this.attributes.create(sharedLocalAttributeCopy);

        this.eventBus.publish(new SharedAttributeCopyCreatedEvent(this.identity.address.toString(), sharedLocalAttributeCopy));
        return sharedLocalAttributeCopy;
    }

    public async createPeerLocalAttribute(params: ICreatePeerLocalAttributeParams): Promise<LocalAttribute> {
        const shareInfo = LocalAttributeShareInfo.from({
            peer: params.peer,
            requestReference: params.requestReference
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

    public async succeedThirdPartyOwnedRelationshipAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateThirdPartyOwnedRelationshipAttributeSuccession(predecessorId, parsedSuccessorParams);
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

        this.eventBus.publish(new ThirdPartyOwnedRelationshipAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));

        return { predecessor, successor };
    }

    private async succeedChildrenOfComplexAttribute(parentSuccessorId: CoreId) {
        const parentSuccessor = await this.getLocalAttribute(parentSuccessorId);
        if (!parentSuccessor) throw CoreErrors.attributes.invalidParentSuccessor(parentSuccessorId);

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
        if (!predecessor) throw CoreErrors.attributes.predecessorDoesNotExist();

        const successor = await this.createAttributeUnsafe({
            id: successorParams.id,
            content: successorParams.content,
            succeeds: predecessorId,
            shareInfo: successorParams.shareInfo,
            parentId: successorParams.parentId,
            createdAt: successorParams.createdAt,
            succeededBy: successorParams.succeededBy
        });

        predecessor.succeededBy = successor.id;
        await this.updateAttributeUnsafe(predecessor);

        return { predecessor, successor };
    }

    public async validateRepositoryAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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
            return ValidationResult.error(CoreErrors.attributes.predecessorIsNotRepositoryAttribute());
        }

        if (!successor.isRepositoryAttribute(this.identity.address)) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotRepositoryAttribute());
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
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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
            return ValidationResult.error(CoreErrors.attributes.predecessorIsNotOwnSharedIdentityAttribute());
        }

        if (!successor.isOwnSharedIdentityAttribute(this.identity.address)) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotOwnSharedIdentityAttribute());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer());
        }

        if (!successor.shareInfo.sourceAttribute) {
            return ValidationResult.error(CoreErrors.attributes.successorSourceAttributeIsNotSpecified());
        }

        const successorSource = await this.getLocalAttribute(successor.shareInfo.sourceAttribute);
        if (!successorSource) {
            return ValidationResult.error(CoreErrors.attributes.successorSourceAttributeDoesNotExist());
        }

        if (!successorSource.isRepositoryAttribute(this.identity.address)) {
            return ValidationResult.error(CoreErrors.attributes.successorSourceAttributeIsNotRepositoryAttribute());
        }

        if (!_.isEqual(successorSource.content, successor.content)) {
            return ValidationResult.error(CoreErrors.attributes.successorSourceContentIsNotEqualToCopyContent());
        }

        let predecessorSource: any = undefined;
        if (predecessor.shareInfo.sourceAttribute) predecessorSource = await this.getLocalAttribute(predecessor.shareInfo.sourceAttribute);

        if (predecessorSource) {
            if (!predecessorSource.isRepositoryAttribute(this.identity.address)) {
                return ValidationResult.error(CoreErrors.attributes.predecessorSourceAttributeIsNotRepositoryAttribute());
            }

            const successorSourceVersionIds = (await this.getVersionsOfAttribute(successorSource.id)).map((x) => x.id.toString());
            if (!predecessorSource.succeededBy || !successorSourceVersionIds.some((id) => id === predecessorSource.succeededBy?.toString())) {
                return ValidationResult.error(CoreErrors.attributes.successorSourceDoesNotSucceedPredecessorSource());
            }

            if (!_.isEqual(predecessorSource.content, predecessor.content)) {
                return ValidationResult.error(CoreErrors.attributes.predecessorSourceContentIsNotEqualToCopyContent());
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
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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
            return ValidationResult.error(CoreErrors.attributes.predecessorIsNotOwnSharedRelationshipAttribute());
        }

        if (!successor.isOwnSharedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotOwnSharedRelationshipAttribute());
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeKey());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer());
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
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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
            return ValidationResult.error(CoreErrors.attributes.predecessorIsNotPeerSharedIdentityAttribute());
        }

        if (!successor.isPeerSharedIdentityAttribute()) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotPeerSharedIdentityAttribute());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer());
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
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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
            return ValidationResult.error(CoreErrors.attributes.predecessorIsNotPeerSharedRelationshipAttribute());
        }

        if (!successor.isPeerSharedRelationshipAttribute()) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotPeerSharedRelationshipAttribute());
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeKey());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer());
        }

        return ValidationResult.success();
    }

    public async validateThirdPartyOwnedRelationshipAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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

        if (!predecessor.isThirdPartyOwnedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(CoreErrors.attributes.predecessorIsNotThirdPartyOwnedRelationshipAttribute());
        }

        if (!successor.isThirdPartyOwnedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotThirdPartyOwnedRelationshipAttribute());
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeKey());
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer());
        }

        return ValidationResult.success();
    }

    public async validateAttributeSuccessionCommon(predecessorId: CoreId, successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.successorIsNotAValidAttribute(e));
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
            if (successor) return ValidationResult.error(CoreErrors.attributes.successorMustNotYetExist());
        }

        if (successor.succeeds && !predecessorId.equals(successor.succeeds.toString())) {
            return ValidationResult.error(CoreErrors.attributes.setPredecessorIdDoesNotMatchActualPredecessorId());
        }

        if (successor.succeededBy) {
            return ValidationResult.error(CoreErrors.attributes.successorMustNotHaveASuccessor());
        }

        if (successor.parentId) {
            return ValidationResult.error(CoreErrors.attributes.cannotSucceedChildOfComplexAttribute(predecessorId.toString()));
        }

        const predecessor = await this.getLocalAttribute(predecessorId);
        if (!predecessor) {
            return ValidationResult.error(CoreErrors.attributes.predecessorDoesNotExist());
        }

        if (predecessor.succeededBy) {
            return ValidationResult.error(CoreErrors.attributes.cannotSucceedAttributesWithASuccessor(predecessor.succeededBy.toString()));
        }

        if (predecessor.parentId) {
            return ValidationResult.error(CoreErrors.attributes.cannotSucceedChildOfComplexAttribute(predecessorId.toString()));
        }

        if (!predecessor.content.owner.equals(CoreAddress.from(successor.content.owner))) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeOwner());
        }

        if (successor.content.constructor !== predecessor.content.constructor) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeContentType());
        }

        if (predecessor.content.value.constructor !== successor.content.value.constructor) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeValueType());
        }

        if (predecessor.hasDeletionInfo() && predecessor.deletionInfo.deletionStatus !== DeletionStatus.DeletionRequestRejected) {
            return ValidationResult.error(CoreErrors.attributes.cannotSucceedAttributesWithDeletionInfo());
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
            deletionInfo: attributeData.deletionInfo
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
            deletionInfo: attributeParams.deletionInfo
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
        for (const attr of [attribute, ...childAttributes]) {
            if (attr.succeededBy) {
                const successor = await this.getLocalAttribute(attr.succeededBy);
                if (!successor) {
                    throw CoreErrors.attributes.successorDoesNotExist();
                }
                await this.detachSuccessor(successor);
            }
        }

        const attributeCopies = await this.getLocalAttributes({ "shareInfo.sourceAttribute": attribute.id.toString() });
        const attributePredecessorCopies = await this.getSharedPredecessorsOfAttribute(attribute);
        const attributeCopiesToDetach = [...attributeCopies, ...attributePredecessorCopies];
        await this.detachAttributeCopies(attributeCopiesToDetach);

        await this.deletePredecessorsOfAttribute(attribute.id);
        await this.deleteAttribute(attribute);
    }

    public async validateFullAttributeDeletionProcess(attribute: LocalAttribute): Promise<ValidationResult> {
        const childAttributes = await this.getLocalAttributes({ parentId: attribute.id.toString() });
        for (const attr of [attribute, ...childAttributes]) {
            const validateSuccessorResult = await this.validateSuccessor(attr);
            if (validateSuccessorResult.isError()) {
                return validateSuccessorResult;
            }
        }

        const attributeCopies = await this.getLocalAttributes({ "shareInfo.sourceAttribute": attribute.id.toString() });
        const attributePredecessorCopies = await this.getSharedPredecessorsOfAttribute(attribute);
        const attributeCopiesToDetach = [...attributeCopies, ...attributePredecessorCopies];

        const validateSharedAttributesResult = this.validateSharedAttributes(attributeCopiesToDetach);
        return validateSharedAttributesResult;
    }

    private async validateSuccessor(predecessor: LocalAttribute): Promise<ValidationResult> {
        if (predecessor.succeededBy) {
            const successor = await this.getLocalAttribute(predecessor.succeededBy);
            if (!successor) {
                return ValidationResult.error(CoreErrors.attributes.successorDoesNotExist());
            }
        }
        return ValidationResult.success();
    }

    private validateSharedAttributes(sharedAttributes: LocalAttribute[]): ValidationResult {
        for (const sharedAttribute of sharedAttributes) {
            if (!sharedAttribute.isShared()) {
                return ValidationResult.error(CoreErrors.attributes.isNotSharedAttribute(sharedAttribute.id));
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
                throw CoreErrors.attributes.isNotSharedAttribute(sharedAttribute.id);
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

    public async getSharedVersionsOfAttribute(id: CoreId, peers?: CoreAddress[], onlyLatestVersions = true): Promise<LocalAttribute[]> {
        const sourceAttribute = await this.getLocalAttribute(id);
        if (!sourceAttribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString());

        const query: any = { "shareInfo.sourceAttribute": sourceAttribute.id.toString() };
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
}
