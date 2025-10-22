import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { EventBus } from "@js-soft/ts-utils";
import {
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
import { CoreAddress, CoreDate, CoreId, LanguageISO639 } from "@nmshd/core-types";
import * as iql from "@nmshd/iql";
import { Relationship, RelationshipStatus, SynchronizedCollection, TagClient, TransportCoreErrors } from "@nmshd/transport";
import _ from "lodash";
import { nameof } from "ts-simple-nameof";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { ConsumptionCoreErrors } from "../../consumption/ConsumptionCoreErrors";
import { ConsumptionError } from "../../consumption/ConsumptionError";
import { ConsumptionIds } from "../../consumption/ConsumptionIds";
import { flattenObject, ValidationResult } from "../common";
import { AttributeCreatedEvent, AttributeDeletedEvent, AttributeForwardingDetailsChangedEvent, AttributeSucceededEvent, AttributeWasViewedAtChangedEvent } from "./events";
import { AttributeTagCollection, IAttributeTag } from "./local/AttributeTagCollection";
import { LocalAttribute, LocalAttributeJSON } from "./local/attributeTypes/LocalAttribute";
import { OwnIdentityAttribute } from "./local/attributeTypes/OwnIdentityAttribute";
import { OwnRelationshipAttribute } from "./local/attributeTypes/OwnRelationshipAttribute";
import { PeerIdentityAttribute } from "./local/attributeTypes/PeerIdentityAttribute";
import { PeerRelationshipAttribute } from "./local/attributeTypes/PeerRelationshipAttribute";
import { ThirdPartyRelationshipAttribute } from "./local/attributeTypes/ThirdPartyRelationshipAttribute";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionStatus, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionStatus } from "./local/deletionInfos";
import { ForwardingDetails } from "./local/forwardingDetails";
import { IdentityAttributeQueryTranslator, RelationshipAttributeQueryTranslator, ThirdPartyRelationshipAttributeQueryTranslator } from "./local/QueryTranslator";
import {
    IOwnIdentityAttributeSuccessorParams,
    IOwnRelationshipAttributeSuccessorParams,
    IPeerIdentityAttributeSuccessorParams,
    IThirdPartyRelationshipAttributeSuccessorParams,
    OwnIdentityAttributeSuccessorParams,
    OwnIdentityAttributeSuccessorParamsJSON,
    OwnRelationshipAttributeSuccessorParams,
    OwnRelationshipAttributeSuccessorParamsJSON,
    PeerIdentityAttributeSuccessorParams,
    PeerIdentityAttributeSuccessorParamsJSON,
    ThirdPartyRelationshipAttributeSuccessorParams,
    ThirdPartyRelationshipAttributeSuccessorParamsJSON
} from "./local/successorParams";
import {
    IPeerRelationshipAttributeSuccessorParams,
    PeerRelationshipAttributeSuccessorParams,
    PeerRelationshipAttributeSuccessorParamsJSON
} from "./local/successorParams/PeerRelationshipAttributeSuccessorParams";

export class AttributesController extends ConsumptionBaseController {
    private attributes: SynchronizedCollection;
    private forwardingDetails: SynchronizedCollection;
    private tagCollection: IDatabaseCollection;
    private attributeTagClient: TagClient;
    private readTagCollectionPromise: Promise<AttributeTagCollection> | undefined;

    private readonly ETAG_DB_KEY = "etag";
    private readonly CACHE_TIMESTAMP_DB_KEY = "cacheTimestamp";
    private readonly TAG_COLLECTION_DB_KEY = "tagCollection";

    public constructor(
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress },
        private readonly setDefaultOwnIdentityAttributes: boolean
    ) {
        super(ConsumptionControllerName.AttributesController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.attributes = await this.parent.accountController.getSynchronizedCollection("Attributes");
        this.forwardingDetails = await this.parent.accountController.getSynchronizedCollection("AttributeForwardingDetails");
        this.tagCollection = await this.parent.accountController.db.getCollection("TagCollection");
        this.attributeTagClient = new TagClient(this.parent.transport.config, this.parent.accountController.authenticator, this.parent.transport.correlator);

        const tagDefinitionCacheExists = await this.tagCollection.exists({ name: this.TAG_COLLECTION_DB_KEY });
        if (!tagDefinitionCacheExists) {
            await this.tagCollection.create({
                name: this.TAG_COLLECTION_DB_KEY,
                value: AttributeTagCollection.from({ supportedLanguages: [], tagsForAttributeValueTypes: {} }).toJSON()
            });
        }
        await this.tagCollection.create({ name: this.ETAG_DB_KEY, value: "" });
        await this.tagCollection.create({ name: this.CACHE_TIMESTAMP_DB_KEY, value: undefined });

        return this;
    }

    public async getLocalAttribute(id: CoreId): Promise<LocalAttribute | undefined> {
        const result = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: id.toString()
        });

        if (!result) return;
        const attribute = LocalAttribute.from(result);

        await this.updateNumberOfForwards(attribute);

        return attribute;
    }

    public async getLocalAttributes(query?: any, hideTechnical = false): Promise<LocalAttribute[]> {
        const enrichedQuery = this.addHideTechnicalToQuery(query, hideTechnical);
        const attributes = await this.attributes.find(enrichedQuery);
        const parsed = this.parseArray(attributes, LocalAttribute);

        const sorted = parsed.sort((a, b) => {
            return a.createdAt.compare(b.createdAt);
        });

        for (const attribute of sorted) await this.updateNumberOfForwards(attribute);

        return sorted;
    }

    private addHideTechnicalToQuery(query: any, hideTechnical: boolean) {
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

    public async executeIQLQuery(query: IIQLQuery): Promise<LocalAttribute[]> {
        /* Fetch subset of attributes relevant for IQL queries. We filter for
         * identity attributes which are not shared. */
        const envelopedAttributes: any[] = await this.attributes.find({ "@type": "OwnIdentityAttribute" });

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

        const attributes = await this.attributes.find(dbQuery);

        return this.parseArray(attributes, LocalAttribute);
    }

    public async createOwnIdentityAttribute(params: { content: IdentityAttribute }): Promise<OwnIdentityAttribute> {
        const attribute = this.trimAttribute(params.content);

        if (!attribute.owner.equals(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating an OwnIdentityAttribute, the owner must match the own address.");
        }

        await this.validateAttributeCreation(attribute);

        let ownIdentityAttribute = OwnIdentityAttribute.from({
            id: await ConsumptionIds.attribute.generate(),
            createdAt: CoreDate.utc(),
            content: attribute
        });
        await this.attributes.create(ownIdentityAttribute);

        if (this.setDefaultOwnIdentityAttributes) ownIdentityAttribute = await this.setAsDefaultOwnIdentityAttribute(ownIdentityAttribute, true);

        await this.updateNumberOfForwards(ownIdentityAttribute);

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), ownIdentityAttribute));
        return ownIdentityAttribute;
    }

    public async setAsDefaultOwnIdentityAttribute(newDefaultAttribute: OwnIdentityAttribute, skipOverwrite?: boolean): Promise<OwnIdentityAttribute> {
        if (!this.setDefaultOwnIdentityAttributes) throw ConsumptionCoreErrors.attributes.setDefaultOwnIdentityAttributesIsDisabled();

        if (newDefaultAttribute.isDefault) return newDefaultAttribute;

        const valueType = newDefaultAttribute.content.value.constructor.name;
        const query = {
            $and: [
                {
                    [`${nameof<OwnIdentityAttribute>((c) => c.content)}.value.@type`]: valueType
                },
                {
                    [nameof<OwnIdentityAttribute>((c) => c.isDefault)]: true
                }
            ]
        };

        const currentDefaultAttributeResult = (await this.getLocalAttributes(query)) as OwnIdentityAttribute[];

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

    public async updateAttributeUnsafe(attribute: LocalAttribute): Promise<LocalAttribute> {
        const doc = await this.attributes.findOne({ [nameof<LocalAttribute>((c) => c.id)]: attribute.id.toString() });
        if (!doc) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.id.toString());

        await this.attributes.update(doc, attribute);
        return attribute;
    }

    public async createPeerIdentityAttribute(params: { content: IdentityAttribute; peer: CoreAddress; sourceReference: CoreId; id: CoreId }): Promise<PeerIdentityAttribute> {
        const attribute = this.trimAttribute(params.content);

        if (attribute.owner.equals(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating a PeerIdentityAttribute, the owner must not match the own address.");
        }

        if (!attribute.owner.equals(params.peer)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating a PeerIdentityAttribute, the owner must match the address of the peer.");
        }

        await this.validateAttributeCreation(attribute);

        const peerIdentityAttribute = PeerIdentityAttribute.from({
            id: params.id,
            content: attribute,
            peer: params.peer,
            sourceReference: params.sourceReference,
            createdAt: CoreDate.utc()
        });
        await this.attributes.create(peerIdentityAttribute);

        await this.updateNumberOfForwards(peerIdentityAttribute);

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), peerIdentityAttribute));
        return peerIdentityAttribute;
    }

    public async createOwnRelationshipAttribute(params: {
        content: RelationshipAttribute;
        peer: CoreAddress;
        sourceReference: CoreId;
        id?: CoreId;
    }): Promise<OwnRelationshipAttribute> {
        const attribute = params.content;

        if (!attribute.owner.equals(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating an OwnRelationshipAttribute, the owner must match the own address.");
        }

        if (params.peer.equals(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating an OwnRelationshipAttribute, the peer must not match the own address.");
        }

        await this.validateAttributeCreation(attribute);

        const ownRelationshipAttribute = OwnRelationshipAttribute.from({
            id: params.id ?? (await ConsumptionIds.attribute.generate()),
            content: attribute,
            peer: params.peer,
            sourceReference: params.sourceReference,
            createdAt: CoreDate.utc()
        });
        await this.attributes.create(ownRelationshipAttribute);

        await this.updateNumberOfForwards(ownRelationshipAttribute);

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), ownRelationshipAttribute));
        return ownRelationshipAttribute;
    }

    public async createPeerRelationshipAttribute(params: {
        content: RelationshipAttribute;
        peer: CoreAddress;
        sourceReference: CoreId;
        id?: CoreId;
    }): Promise<PeerRelationshipAttribute> {
        const attribute = params.content;

        if (attribute.owner.equals(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating a PeerRelationshipAttribute, the owner must not match the own address.");
        }

        if (!attribute.owner.equals(params.peer)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating a PeerRelationshipAttribute, the owner must match the address of the peer.");
        }

        await this.validateAttributeCreation(attribute);

        const peerRelationshipAttribute = PeerRelationshipAttribute.from({
            id: params.id ?? (await ConsumptionIds.attribute.generate()),
            content: attribute,
            peer: params.peer,
            sourceReference: params.sourceReference,
            createdAt: CoreDate.utc()
        });
        await this.attributes.create(peerRelationshipAttribute);

        await this.updateNumberOfForwards(peerRelationshipAttribute);

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), peerRelationshipAttribute));
        return peerRelationshipAttribute;
    }

    public async createThirdPartyRelationshipAttribute(params: {
        content: RelationshipAttribute;
        peer: CoreAddress;
        sourceReference: CoreId;
        initialAttributePeer: CoreAddress;
        id: CoreId;
    }): Promise<ThirdPartyRelationshipAttribute> {
        const attribute = params.content;

        if (attribute.owner.equals(this.identity.address)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating a ThirdPartyRelationshipAttribute, the owner must not match the own address.");
        }

        if (!(attribute.owner.equals(params.peer) || attribute.owner.equals(params.initialAttributePeer))) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute(
                "When creating a ThirdPartyRelationshipAttribute, the owner must match the address of the peer or initial Attribute peer."
            );
        }

        if (params.peer.equals(params.initialAttributePeer)) {
            throw ConsumptionCoreErrors.attributes.wrongOwnerOfAttribute("When creating a ThirdPartyRelationshipAttribute, the peer must not match the initialAttributePeer.");
        }

        await this.validateAttributeCreation(attribute);

        const thirdPartyRelationshipAttribute = ThirdPartyRelationshipAttribute.from({
            id: params.id,
            content: attribute,
            peer: params.peer,
            sourceReference: params.sourceReference,
            initialAttributePeer: params.initialAttributePeer,
            createdAt: CoreDate.utc()
        });
        await this.attributes.create(thirdPartyRelationshipAttribute);

        await this.updateNumberOfForwards(thirdPartyRelationshipAttribute);

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), thirdPartyRelationshipAttribute));
        return thirdPartyRelationshipAttribute;
    }

    private async validateAttributeCreation(attribute: IdentityAttribute | RelationshipAttribute): Promise<void> {
        if (!this.validateAttributeCharacters(attribute)) throw ConsumptionCoreErrors.attributes.forbiddenCharactersInAttribute("The Attribute contains forbidden characters.");

        if (attribute instanceof RelationshipAttribute) return;

        const tagValidationResult = await this.validateTagsOfAttribute(attribute);
        if (tagValidationResult.isError()) throw tagValidationResult.error;
    }

    public async addForwardingDetailsToAttribute<T extends OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute>(
        attribute: T,
        peer: CoreAddress,
        sourceReference: CoreId
    ): Promise<T> {
        if (await this.isForwardedTo(attribute, peer, true)) throw ConsumptionCoreErrors.attributes.alreadyForwarded(attribute.id, peer);

        const existingForwardingDetails = await this.getForwardingDetailsNotDeletedByRecipient(attribute, peer);
        const forwardingDetails = existingForwardingDetails
            ? (() => {
                  existingForwardingDetails.deletionInfo = undefined;
                  return existingForwardingDetails;
              })()
            : ForwardingDetails.from({
                  id: await ConsumptionIds.attributeForwardingDetails.generate(),
                  attributeId: attribute.id,
                  peer,
                  sourceReference,
                  sharedAt: CoreDate.utc()
              });

        await this.upsertForwardingDetailsForPeer(attribute, peer, forwardingDetails);

        this.eventBus.publish(new AttributeForwardingDetailsChangedEvent(this.identity.address.toString(), attribute));
        return attribute;
    }

    public async succeedOwnIdentityAttribute(
        predecessor: OwnIdentityAttribute,
        successorParams: IOwnIdentityAttributeSuccessorParams | OwnIdentityAttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: OwnIdentityAttribute; successor: OwnIdentityAttribute }> {
        const parsedSuccessorParams = OwnIdentityAttributeSuccessorParams.from(successorParams);
        const attribute = this.trimAttribute(parsedSuccessorParams.content);

        if (validate) {
            const validationResult = await this.validateOwnIdentityAttributeSuccession(predecessor, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const successor = OwnIdentityAttribute.from({
            id: await ConsumptionIds.attribute.generate(),
            content: attribute,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            isDefault: predecessor.isDefault
        });
        await this.succeedAttributeUnsafe(predecessor, successor);

        await this.removeDefault(predecessor);

        this.eventBus.publish(new AttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));
        return { predecessor, successor };
    }

    private async succeedAttributeUnsafe(predecessor: LocalAttribute, successor: LocalAttribute): Promise<void> {
        await this.attributes.create(successor);

        predecessor.succeededBy = successor.id;
        await this.updateAttributeUnsafe(predecessor);
    }

    private async removeDefault(attribute: OwnIdentityAttribute): Promise<OwnIdentityAttribute> {
        if (!attribute.isDefault) return attribute;

        attribute.isDefault = undefined;
        await this.updateAttributeUnsafe(attribute);
        return attribute;
    }

    public async succeedPeerIdentityAttribute(
        predecessor: PeerIdentityAttribute,
        successorParams: IPeerIdentityAttributeSuccessorParams | PeerIdentityAttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: PeerIdentityAttribute; successor: PeerIdentityAttribute }> {
        const parsedSuccessorParams = PeerIdentityAttributeSuccessorParams.from(successorParams);
        const attribute = this.trimAttribute(parsedSuccessorParams.content);

        if (validate) {
            const validationResult = await this.validatePeerIdentityAttributeSuccession(predecessor, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const successor = PeerIdentityAttribute.from({
            id: parsedSuccessorParams.id,
            content: attribute,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference
        });
        await this.succeedAttributeUnsafe(predecessor, successor);

        return { predecessor, successor };
    }

    public async succeedOwnRelationshipAttribute(
        predecessor: OwnRelationshipAttribute,
        successorParams: IOwnRelationshipAttributeSuccessorParams | OwnRelationshipAttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: OwnRelationshipAttribute; successor: OwnRelationshipAttribute }> {
        const parsedSuccessorParams = OwnRelationshipAttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateOwnRelationshipAttributeSuccession(predecessor, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const successor = OwnRelationshipAttribute.from({
            id: await ConsumptionIds.attribute.generate(),
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference
        });
        await this.succeedAttributeUnsafe(predecessor, successor);

        await this.updateNumberOfForwards(successor);

        this.eventBus.publish(new AttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));
        return { predecessor, successor };
    }

    public async succeedPeerRelationshipAttribute(
        predecessor: PeerRelationshipAttribute,
        successorParams: IPeerRelationshipAttributeSuccessorParams | PeerRelationshipAttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: PeerRelationshipAttribute; successor: PeerRelationshipAttribute }> {
        const parsedSuccessorParams = PeerRelationshipAttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validatePeerRelationshipAttributeSuccession(predecessor, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const successor = PeerRelationshipAttribute.from({
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference
        });
        await this.succeedAttributeUnsafe(predecessor, successor);

        return { predecessor, successor };
    }

    public async succeedThirdPartyRelationshipAttribute(
        predecessor: ThirdPartyRelationshipAttribute,
        successorParams: IThirdPartyRelationshipAttributeSuccessorParams | ThirdPartyRelationshipAttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: ThirdPartyRelationshipAttribute; successor: ThirdPartyRelationshipAttribute }> {
        const parsedSuccessorParams = ThirdPartyRelationshipAttributeSuccessorParams.from(successorParams);

        if (validate) {
            const validationResult = await this.validateThirdPartyRelationshipAttributeSuccession(predecessor, parsedSuccessorParams);
            if (validationResult.isError()) throw validationResult.error;
        }

        const successor = ThirdPartyRelationshipAttribute.from({
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference,
            initialAttributePeer: predecessor.initialAttributePeer
        });
        await this.succeedAttributeUnsafe(predecessor, successor);

        this.eventBus.publish(new AttributeSucceededEvent(this.identity.address.toString(), predecessor, successor));
        return { predecessor, successor };
    }

    public async validateOwnIdentityAttributeSuccession(
        predecessor: OwnIdentityAttribute,
        successorParams: OwnIdentityAttributeSuccessorParams | OwnIdentityAttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = OwnIdentityAttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const tagValidationResult = await this.validateTagsOfAttribute(parsedSuccessorParams.content);
        if (tagValidationResult.isError()) throw tagValidationResult.error;

        const successor = OwnIdentityAttribute.from({
            id: await ConsumptionIds.attribute.generate(),
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id
        });

        return await this.validateAttributeSuccession(predecessor, successor);
    }

    public async validatePeerIdentityAttributeSuccession(
        predecessor: PeerIdentityAttribute,
        successorParams: PeerIdentityAttributeSuccessorParams | PeerIdentityAttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = PeerIdentityAttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const successor = PeerIdentityAttribute.from({
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference
        });

        if (predecessor.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByEmitter) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedSharedAttributesDeletedByPeer());
        }

        return await this.validateAttributeSuccession(predecessor, successor);
    }

    public async validateOwnRelationshipAttributeSuccession(
        predecessor: OwnRelationshipAttribute,
        successorParams: OwnRelationshipAttributeSuccessorParams | OwnRelationshipAttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = OwnRelationshipAttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const successor = OwnRelationshipAttribute.from({
            id: await ConsumptionIds.attribute.generate(),
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference
        });

        if (predecessor.content.key !== successor.content.key) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeKey());
        }

        if (predecessor.deletionInfo?.deletionStatus === EmittedAttributeDeletionStatus.DeletedByRecipient) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedSharedAttributesDeletedByPeer());
        }

        return await this.validateAttributeSuccession(predecessor, successor);
    }

    public async validatePeerRelationshipAttributeSuccession(
        predecessor: PeerRelationshipAttribute,
        successorParams: IPeerRelationshipAttributeSuccessorParams | PeerRelationshipAttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = PeerRelationshipAttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const successor = PeerRelationshipAttribute.from({
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference
        });

        if (predecessor.content.key !== successor.content.key) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeKey());
        }

        if (predecessor.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByEmitter) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedSharedAttributesDeletedByPeer());
        }

        return await this.validateAttributeSuccession(predecessor, successor);
    }

    public async validateThirdPartyRelationshipAttributeSuccession(
        predecessor: ThirdPartyRelationshipAttribute,
        successorParams: ThirdPartyRelationshipAttributeSuccessorParams | ThirdPartyRelationshipAttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams;
        try {
            parsedSuccessorParams = ThirdPartyRelationshipAttributeSuccessorParams.from(successorParams);
        } catch (e: unknown) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successorIsNotAValidAttribute(e));
        }

        const successor = ThirdPartyRelationshipAttribute.from({
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            createdAt: CoreDate.utc(),
            succeeds: predecessor.id,
            peer: predecessor.peer,
            sourceReference: parsedSuccessorParams.sourceReference,
            initialAttributePeer: predecessor.initialAttributePeer
        });

        if (predecessor.content.key !== successor.content.key) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeKey());
        }

        if (predecessor.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByEmitter) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedSharedAttributesDeletedByPeer());
        }

        return await this.validateAttributeSuccession(predecessor, successor);
    }

    private async validateAttributeSuccession(predecessor: LocalAttribute, successor: LocalAttribute): Promise<ValidationResult> {
        const existingAttributeWithSameId = await this.getLocalAttribute(successor.id);
        if (existingAttributeWithSameId) return ValidationResult.error(ConsumptionCoreErrors.attributes.successorMustNotYetExist());

        if (predecessor.succeededBy) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.cannotSucceedAttributesWithASuccessor(predecessor.succeededBy.toString()));
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

        if (!this.validateAttributeCharacters(successor.content)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.forbiddenCharactersInAttribute("The successor contains forbidden characters."));
        }

        return ValidationResult.success();
    }

    public async deleteAttribute(attributeId: CoreId): Promise<void> {
        const attribute = await this.getLocalAttribute(attributeId);
        if (!attribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attributeId.toString());

        await this.deleteAttributeUnsafe(attributeId);
        this.eventBus.publish(new AttributeDeletedEvent(this.identity.address.toString(), attribute));
    }

    public async deleteAttributeUnsafe(id: CoreId): Promise<void> {
        await this.attributes.delete({ id: id });
    }

    public async deleteAttributesExchangedWithPeer(peer: CoreAddress): Promise<void> {
        const receivedAttributes = await this.getLocalAttributes({ peer: peer.toString() });
        for (const attribute of receivedAttributes) {
            await this.deleteAttributeUnsafe(attribute.id);
        }

        const forwardedAttributes = (await this.getLocalAttributesExchangedWithPeer(
            peer,
            {
                "@type": { $in: ["OwnIdentityAttribute", "OwnRelationshipAttribute", "PeerRelationshipAttribute"] }
            },
            undefined,
            true
        )) as (OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute)[];
        for (const attribute of forwardedAttributes) {
            await this.removeForwardingDetailsFromAttribute(attribute, peer);
        }
    }

    public async removeForwardingDetailsFromAttribute<T extends OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute>(
        attribute: T,
        peer: CoreAddress
    ): Promise<T> {
        const existingForwardedSharingDetailObjects = await this.forwardingDetails.find({ attributeId: attribute.id.toString(), peer: peer.toString() });
        const existingForwardingDetails = existingForwardedSharingDetailObjects.map((obj) => ForwardingDetails.from(obj));

        for (const detail of existingForwardingDetails) {
            await this.forwardingDetails.delete(detail);
        }

        await this.updateNumberOfForwards(attribute);

        this.eventBus.publish(new AttributeForwardingDetailsChangedEvent(this.identity.address.toString(), attribute));
        return attribute;
    }

    public async executeFullAttributeDeletionProcess(attribute: LocalAttribute): Promise<void> {
        const validationResult = await this.validateFullAttributeDeletionProcess(attribute.id);
        if (validationResult.isError()) throw validationResult.error;

        if (attribute.succeededBy) {
            const successor = await this.getLocalAttribute(attribute.succeededBy);
            if (!successor) throw ConsumptionCoreErrors.attributes.successorDoesNotExist();

            await this.detachSuccessor(successor);
        }

        await this.deletePredecessorsOfAttribute(attribute);

        if (attribute instanceof OwnIdentityAttribute && this.setDefaultOwnIdentityAttributes) await this.transferDefault(attribute);

        await this.deleteAttribute(attribute.id);
    }

    public async validateFullAttributeDeletionProcess(attributeId: CoreId): Promise<ValidationResult> {
        const attribute = await this.getLocalAttribute(attributeId);
        if (!attribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attributeId.toString());

        if (attribute.succeededBy) {
            const successor = await this.getLocalAttribute(attribute.succeededBy);
            if (!successor) return ValidationResult.error(ConsumptionCoreErrors.attributes.successorDoesNotExist());
        }

        return ValidationResult.success();
    }

    private async detachSuccessor(successor: LocalAttribute): Promise<void> {
        successor.succeeds = undefined;
        await this.updateAttributeUnsafe(successor);
    }

    private async deletePredecessorsOfAttribute(attribute: LocalAttribute): Promise<void> {
        const predecessors = await this.getPredecessorsOfAttribute(attribute);
        for (const predecessor of predecessors) {
            await this.deleteAttribute(predecessor.id);
        }
    }

    private async transferDefault(attribute: OwnIdentityAttribute): Promise<void> {
        if (!this.setDefaultOwnIdentityAttributes) throw ConsumptionCoreErrors.attributes.setDefaultOwnIdentityAttributesIsDisabled();

        if (!attribute.isDefault) return;

        const valueType = attribute.content.value.constructor.name;
        const query = {
            $and: [
                { [`@type`]: "OwnIdentityAttribute" },
                { [`${nameof<LocalAttribute>((c) => c.content)}.value.@type`]: valueType },
                { [nameof<LocalAttribute>((c) => c.succeededBy)]: undefined },
                { [nameof<LocalAttribute>((c) => c.id)]: { $ne: attribute.id.toString() } }
            ]
        };

        const defaultCandidates = (await this.getLocalAttributes(query)) as OwnIdentityAttribute[];
        if (defaultCandidates.length === 0) return;

        defaultCandidates[defaultCandidates.length - 1].isDefault = true;
        await this.updateAttributeUnsafe(defaultCandidates[defaultCandidates.length - 1]);
    }

    public async getVersionsOfAttribute<T extends LocalAttribute>(attribute: T): Promise<T[]> {
        const predecessors = await this.getPredecessorsOfAttribute(attribute);
        const successors = await this.getSuccessorsOfAttribute(attribute);

        const allAttributeVersions = [...successors.reverse(), attribute, ...predecessors];
        return allAttributeVersions;
    }

    public async getPredecessorsOfAttribute<T extends LocalAttribute>(attribute: T): Promise<T[]> {
        const predecessors: T[] = [];
        while (attribute.succeeds) {
            const predecessor = (await this.getLocalAttribute(attribute.succeeds)) as T | undefined;
            if (!predecessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeeds.toString());

            await this.updateNumberOfForwards(predecessor);

            attribute = predecessor;
            predecessors.push(attribute);
        }

        return predecessors;
    }

    public async getSuccessorsOfAttribute<T extends LocalAttribute>(attribute: T): Promise<T[]> {
        const successors: T[] = [];
        while (attribute.succeededBy) {
            const successor = (await this.getLocalAttribute(attribute.succeededBy)) as T | undefined;
            if (!successor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeededBy.toString());

            await this.updateNumberOfForwards(successor);

            attribute = successor;
            successors.push(successor);
        }

        return successors;
    }

    public async isSubsequentInSuccession(predecessorId: CoreId, successorId: CoreId): Promise<boolean> {
        let predecessor = await this.getLocalAttribute(predecessorId);
        if (!predecessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, predecessorId.toString());

        const successor = await this.getLocalAttribute(successorId);
        if (!successor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, successorId.toString());

        while (predecessor.succeededBy) {
            const directSuccessor = await this.getLocalAttribute(predecessor.succeededBy);
            if (!directSuccessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, predecessor.succeededBy.toString());

            if (predecessor.succeededBy.toString() === successor.id.toString()) return true;

            predecessor = directSuccessor;
        }
        return false;
    }

    public async getVersionsOfAttributeSharedWithPeer<T extends OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute>(
        attribute: T,
        peerAddress: CoreAddress,
        onlyLatestVersion = true,
        excludeToBeDeleted = false
    ): Promise<T[]> {
        const sharedAttribute = (await this.isForwardedTo(attribute, peerAddress, excludeToBeDeleted)) ? [attribute] : [];
        const sharedPredecessors = await this.getPredecessorsOfAttributeSharedWithPeer(attribute, peerAddress, excludeToBeDeleted);
        const sharedSuccessors = await this.getSuccessorsOfAttributeSharedWithPeer(attribute, peerAddress, excludeToBeDeleted);

        const sharedAttributeVersions = [...sharedSuccessors.reverse(), ...sharedAttribute, ...sharedPredecessors];

        if (onlyLatestVersion) return sharedAttributeVersions.length > 0 ? [sharedAttributeVersions[0]] : [];

        return sharedAttributeVersions;
    }

    public async getPredecessorsOfAttributeSharedWithPeer<T extends OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute>(
        referenceAttribute: T,
        peerAddress: CoreAddress,
        excludeToBeDeleted = false
    ): Promise<T[]> {
        const matchingPredecessors: T[] = [];
        while (referenceAttribute.succeeds) {
            const predecessor = (await this.getLocalAttribute(referenceAttribute.succeeds)) as T | undefined;
            if (!predecessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, referenceAttribute.succeeds.toString());

            referenceAttribute = predecessor;

            if (await this.isForwardedTo(referenceAttribute, peerAddress, excludeToBeDeleted)) matchingPredecessors.push(referenceAttribute);
        }

        return matchingPredecessors;
    }

    public async getSuccessorsOfAttributeSharedWithPeer<T extends OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute>(
        referenceAttribute: T,
        peerAddress: CoreAddress,
        excludeToBeDeleted = false
    ): Promise<T[]> {
        const matchingSuccessors: T[] = [];
        while (referenceAttribute.succeededBy) {
            const successor = (await this.getLocalAttribute(referenceAttribute.succeededBy)) as T | undefined;
            if (!successor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, referenceAttribute.succeededBy.toString());

            referenceAttribute = successor;

            if (await this.isForwardedTo(referenceAttribute, peerAddress, excludeToBeDeleted)) matchingSuccessors.push(referenceAttribute);
        }

        return matchingSuccessors;
    }

    public async getPeersWithExclusivelyForwardedPredecessors(attributeId: CoreId): Promise<[CoreAddress, CoreId][]> {
        let attribute = (await this.getLocalAttribute(attributeId)) as OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | undefined;
        if (!attribute) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attributeId.toString());

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                `The Attribute ${attributeId} is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute.`
            );
        }

        const peersWithLaterSharedVersion = await this.getForwardingPeers(attribute, true);

        const peersWithExclusivelyForwardedPredecessors: [CoreAddress, CoreId][] = [];
        while (attribute.succeeds) {
            const predecessor = (await this.getLocalAttribute(attribute.succeeds)) as OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | undefined;
            if (!predecessor) throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeeds.toString());

            attribute = predecessor;
            const forwardingPeers = await this.getForwardingPeers(attribute, true);

            const newPeers = forwardingPeers.filter((peer) => !peersWithLaterSharedVersion.some((peerWithLaterSharedVersion) => peerWithLaterSharedVersion.equals(peer)));
            if (newPeers.length === 0) continue;

            for (const peer of newPeers) {
                peersWithExclusivelyForwardedPredecessors.push([peer, attribute.id]);
            }

            peersWithLaterSharedVersion.push(...newPeers);
        }
        return peersWithExclusivelyForwardedPredecessors;
    }

    public async getOwnIdentityAttributeWithSameValue(value: AttributeValues.Identity.Json): Promise<OwnIdentityAttribute | undefined> {
        const trimmedValue = this.trimAttributeValue(value);
        const queryForOwnIdentityAttributeDuplicates = flattenObject({
            "@type": "OwnIdentityAttribute",
            content: { value: trimmedValue }
        });
        queryForOwnIdentityAttributeDuplicates["succeededBy"] = { $exists: false };

        return (await this.getAttributeWithSameValue(trimmedValue, queryForOwnIdentityAttributeDuplicates)) as OwnIdentityAttribute | undefined;
    }

    public async getPeerIdentityAttributeWithSameValue(value: AttributeValues.Identity.Json, owner: string): Promise<PeerIdentityAttribute | undefined> {
        const trimmedValue = this.trimAttributeValue(value);
        const query = flattenObject({
            "@type": "PeerIdentityAttribute",
            content: {
                value: trimmedValue,
                owner: owner
            }
        });
        query["deletionInfo.deletionStatus"] = { $ne: ReceivedAttributeDeletionStatus.DeletedByEmitter };

        return (await this.getAttributeWithSameValue(trimmedValue, query)) as PeerIdentityAttribute | undefined;
    }

    public async getThirdPartyRelationshipAttributeWithSameValue(
        value: AttributeValues.Relationship.Json,
        peer: string,
        owner: string,
        key: string
    ): Promise<ThirdPartyRelationshipAttribute | undefined> {
        const query = flattenObject({
            "@type": "ThirdPartyRelationshipAttribute",
            content: {
                value: value,
                owner: owner,
                key: key
            }
        });
        query["peer"] = peer;
        query["deletionInfo.deletionStatus"] = { $ne: ReceivedAttributeDeletionStatus.DeletedByEmitter };

        return (await this.getAttributeWithSameValue(value, query)) as ThirdPartyRelationshipAttribute | undefined;
    }

    private async getAttributeWithSameValue(value: AttributeValues.Identity.Json | AttributeValues.Relationship.Json, query: any): Promise<LocalAttribute | undefined> {
        const matchingAttributes = await this.getLocalAttributes(query);

        const attributeDuplicate = matchingAttributes.find((duplicate) => _.isEqual(duplicate.content.value.toJSON(), value));
        return attributeDuplicate;
    }

    private trimAttribute(attribute: IdentityAttribute): IdentityAttribute {
        const trimmedAttribute = {
            ...attribute.toJSON(),
            value: this.trimAttributeValue(attribute.value.toJSON() as AttributeValues.Identity.Json)
        };
        return IdentityAttribute.from(trimmedAttribute);
    }

    private trimAttributeValue(value: AttributeValues.Identity.Json): AttributeValues.Identity.Json {
        const trimmedEntries = Object.entries(value).map((entry) => (typeof entry[1] === "string" ? [entry[0], entry[1].trim()] : entry));
        return Object.fromEntries(trimmedEntries) as AttributeValues.Identity.Json;
    }

    public async getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
        key: string,
        owner: CoreAddress,
        valueType: string,
        peer: CoreAddress
    ): Promise<OwnRelationshipAttribute[] | PeerRelationshipAttribute[]> {
        const query = {
            "@type": { $in: ["OwnRelationshipAttribute", "PeerRelationshipAttribute"] },
            "content.owner": owner.toString(),
            "content.key": key,
            "content.value.@type": valueType,
            peer: peer.toString(),
            "deletionInfo.deletionStatus": {
                $nin: [
                    EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
                    EmittedAttributeDeletionStatus.DeletedByRecipient,
                    ReceivedAttributeDeletionStatus.ToBeDeleted,
                    ReceivedAttributeDeletionStatus.DeletedByEmitter
                ]
            }
        };
        return (await this.getLocalAttributes(query)) as OwnRelationshipAttribute[] | PeerRelationshipAttribute[];
    }

    public async getAttributeTagCollection(): Promise<AttributeTagCollection> {
        if (this.readTagCollectionPromise) {
            return await this.readTagCollectionPromise;
        }

        this.readTagCollectionPromise = this._getAttributeTagCollection();

        try {
            return await this.readTagCollectionPromise;
        } finally {
            this.readTagCollectionPromise = undefined;
        }
    }

    private async _getAttributeTagCollection(): Promise<AttributeTagCollection> {
        const isCacheValid = await this.isTagCollectionCacheValid();
        if (isCacheValid) {
            return await this.getTagCollection();
        }

        const backboneTagCollection = await this.attributeTagClient.getTagCollection(await this.getETag());
        if (!backboneTagCollection) {
            return await this.getTagCollection();
        }

        await this.setETag(backboneTagCollection.etag ?? "");
        await this.updateCacheTimestamp();
        const attributeTagCollection = AttributeTagCollection.from(backboneTagCollection.value);
        await this.setTagCollection(attributeTagCollection);

        return attributeTagCollection;
    }

    private async getTagCollection(): Promise<AttributeTagCollection> {
        const newLocal = await this.tagCollection.findOne({ name: this.TAG_COLLECTION_DB_KEY });
        return AttributeTagCollection.from(newLocal.value);
    }

    private async setTagCollection(tagCollection: AttributeTagCollection): Promise<void> {
        await this.tagCollection.update(await this.tagCollection.findOne({ name: this.TAG_COLLECTION_DB_KEY }), {
            name: this.TAG_COLLECTION_DB_KEY,
            value: tagCollection.toJSON()
        });
    }

    private async getETag(): Promise<string | undefined> {
        return (await this.tagCollection.findOne({ name: this.ETAG_DB_KEY }))?.value;
    }

    private async setETag(etag: string): Promise<void> {
        await this.tagCollection.update(await this.tagCollection.findOne({ name: this.ETAG_DB_KEY }), { name: this.ETAG_DB_KEY, value: etag });
    }

    private async isTagCollectionCacheValid(): Promise<boolean> {
        return (await this.getCacheTimestamp())?.isSameOrAfter(CoreDate.utc().subtract({ minutes: this.parent.accountController.config.tagCacheLifetimeInMinutes })) ?? false;
    }

    private async getCacheTimestamp(): Promise<CoreDate | undefined> {
        try {
            return CoreDate.from((await this.tagCollection.findOne({ name: this.CACHE_TIMESTAMP_DB_KEY })).value);
        } catch {
            return undefined;
        }
    }

    private async updateCacheTimestamp(): Promise<void> {
        await this.tagCollection.update(await this.tagCollection.findOne({ name: this.CACHE_TIMESTAMP_DB_KEY }), {
            name: this.CACHE_TIMESTAMP_DB_KEY,
            value: CoreDate.utc().toJSON()
        });
    }

    public async validateTagsOfAttribute(attribute: IdentityAttribute | RelationshipAttribute): Promise<ValidationResult> {
        if (attribute instanceof RelationshipAttribute) return ValidationResult.success();
        if (!attribute.tags || attribute.tags.length === 0) return ValidationResult.success();

        return await this.validateTagsForType(attribute.tags, attribute.toJSON().value["@type"]);
    }

    public async validateTagsForType(tags: string[], attributeValueType: string): Promise<ValidationResult> {
        const tagCollection = await this.getAttributeTagCollection();
        const tagsForAttributeValueType = tagCollection.tagsForAttributeValueTypes[attributeValueType];
        const invalidTags = [];
        for (const tag of tags) {
            if (!this.isValidTag(tag, tagsForAttributeValueType)) {
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
        const customPrefix = "x:";
        const urnPrefix = "urn:";
        if (tag.toLowerCase().startsWith(customPrefix) || tag.startsWith(urnPrefix)) return true;

        const languagePrefix = "language:";
        if (tag.startsWith(languagePrefix)) return Object.values(LanguageISO639).includes(tag.substring(languagePrefix.length) as LanguageISO639);

        const mimetypePrefix = "mimetype:";
        if (tag.startsWith(mimetypePrefix)) return /^[a-z-*]+\/[a-z-*]+$/.test(tag.substring(mimetypePrefix.length));

        const backbonePrefix = "bkb:";
        const isBackboneTag = tag.toLowerCase().startsWith(backbonePrefix);
        if (!isBackboneTag) return false;

        const tagPartsWithoutPrefix = tag.split(":").slice(1);
        for (const part of tagPartsWithoutPrefix) {
            if (!validTags?.[part]) return false;
            validTags = validTags[part].children;
        }

        return !validTags;
    }

    public validateAttributeCharacters(attribute: IdentityAttribute | RelationshipAttribute): boolean {
        const regex =
            /^([\u0009-\u000A]|\u000D|[ -~]|[ -¬]|[®-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/;
        if (attribute instanceof IdentityAttribute) {
            return Object.values(attribute.value.toJSON()).every((entry) => typeof entry !== "string" || regex.test(entry));
        }

        const nonDescriptiveEntries = Object.entries(attribute.value.toJSON()).filter((entry) => !["title", "description"].includes(entry[0]));
        return nonDescriptiveEntries.every((entry) => typeof entry[1] !== "string" || regex.test(entry[1]));
    }

    public async setAttributeDeletionInfoOfDeletionProposedRelationship(relationshipId: CoreId): Promise<void> {
        const relationship = await this.parent.accountController.relationships.getRelationship(relationshipId);
        if (!relationship) throw TransportCoreErrors.general.recordNotFound(Relationship, relationshipId.toString());

        if (relationship.status !== RelationshipStatus.DeletionProposed) {
            throw ConsumptionCoreErrors.attributes.wrongRelationshipStatusToSetDeletionInfo();
        }

        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;

        await this.setDeletionInfoOfAttributesSharedWithPeer(relationship.peer.address, deletionDate);
    }

    private async setDeletionInfoOfAttributesSharedWithPeer(peer: CoreAddress, deletionDate: CoreDate): Promise<void> {
        await this.setForwardedDeletionInfoOfAttributes(peer, deletionDate);
        await this.setPeerDeletionInfoOfOwnRelationshipAttributes(peer, deletionDate);
        await this.setPeerDeletionInfoOfReceivedAttributes(peer, deletionDate);
    }

    private async setForwardedDeletionInfoOfAttributes(peer: CoreAddress, deletionDate: CoreDate): Promise<void> {
        const deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
            deletionDate
        });

        const forwardingDetailsForPeer = await this.forwardingDetails.find({
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        });
        if (forwardingDetailsForPeer.length === 0) return;

        const attributeIds = forwardingDetailsForPeer.map((detail) => CoreId.from(detail.attributeId));

        const attributesForwardedToPeer = (await this.getLocalAttributes({
            "@type": { $in: ["OwnIdentityAttribute", "OwnRelationshipAttribute", "PeerRelationshipAttribute"] },
            id: { $in: attributeIds.map((id) => id.toString()) }
        })) as OwnIdentityAttribute[] | OwnRelationshipAttribute[] | PeerRelationshipAttribute[];

        for (const attribute of attributesForwardedToPeer) {
            await this.setForwardedDeletionInfoOfAttribute(attribute, deletionInfo, peer);
        }
    }

    private async setPeerDeletionInfoOfOwnRelationshipAttributes(peer: CoreAddress, deletionDate: CoreDate): Promise<void> {
        const deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
            deletionDate
        });

        const attributesSharedWithPeer = (await this.getLocalAttributes({
            "@type": "OwnRelationshipAttribute",
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        })) as OwnRelationshipAttribute[];

        for (const attribute of attributesSharedWithPeer) {
            await this.setPeerDeletionInfoOfOwnRelationshipAttribute(attribute, deletionInfo);
        }
    }

    private async setPeerDeletionInfoOfReceivedAttributes(peer: CoreAddress, deletionDate: CoreDate): Promise<void> {
        const deletionInfo = ReceivedAttributeDeletionInfo.from({
            deletionStatus: ReceivedAttributeDeletionStatus.DeletedByEmitter,
            deletionDate
        });

        const attributesReceivedFromPeer = (await this.getLocalAttributes({
            "@type": { $in: ["PeerIdentityAttribute", "PeerRelationshipAttribute", "ThirdPartyRelationshipAttribute"] },
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: ReceivedAttributeDeletionStatus.DeletedByEmitter }
        })) as PeerIdentityAttribute[];

        for (const attribute of attributesReceivedFromPeer) {
            await this.setPeerDeletionInfoOfReceivedAttribute(attribute, deletionInfo);
        }
    }

    public async setForwardedDeletionInfoOfAttribute(
        attribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute,
        deletionInfo: EmittedAttributeDeletionInfo | undefined,
        peer: CoreAddress,
        overrideDeletedOrToBeDeleted = false
    ): Promise<void> {
        if ((await this.isDeletedOrToBeDeletedByForwardingPeer(attribute, peer)) && !overrideDeletedOrToBeDeleted) return;

        await this.setDeletionInfoForForwardingPeer(attribute, deletionInfo, peer, overrideDeletedOrToBeDeleted);
    }

    public async setPeerDeletionInfoOfOwnRelationshipAttribute(
        attribute: OwnRelationshipAttribute,
        deletionInfo: EmittedAttributeDeletionInfo | undefined,
        overrideDeletedOrToBeDeleted = false
    ): Promise<void> {
        if (attribute.isDeletedOrToBeDeletedByRecipient() && !overrideDeletedOrToBeDeleted) return;

        attribute.setPeerDeletionInfo(deletionInfo, overrideDeletedOrToBeDeleted);
        await this.updateAttributeUnsafe(attribute);
    }

    public async setPeerDeletionInfoOfReceivedAttribute(
        attribute: PeerIdentityAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute,
        deletionInfo: ReceivedAttributeDeletionInfo | undefined,
        overrideDeletedOrToBeDeleted = false
    ): Promise<void> {
        if (attribute.isDeletedByEmitterOrToBeDeleted() && !overrideDeletedOrToBeDeleted) return;

        attribute.setPeerDeletionInfo(deletionInfo, overrideDeletedOrToBeDeleted);
        await this.updateAttributeUnsafe(attribute);
    }

    public async setForwardedDeletionInfoOfAttributeAndPredecessors(
        attribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute,
        deletionInfo: EmittedAttributeDeletionInfo | undefined,
        peer: CoreAddress,
        overrideDeletedOrToBeDeleted = false
    ): Promise<void> {
        const predecessors = await this.getPredecessorsOfAttribute(attribute);

        for (const attr of [attribute, ...predecessors]) {
            await this.setForwardedDeletionInfoOfAttribute(attr, deletionInfo, peer, overrideDeletedOrToBeDeleted);
        }
    }

    public async setPeerDeletionInfoOfOwnRelationshipAttributeAndPredecessors(
        attribute: OwnRelationshipAttribute,
        deletionInfo: EmittedAttributeDeletionInfo | undefined,
        overrideDeletedOrToBeDeleted = false
    ): Promise<void> {
        const predecessors = await this.getPredecessorsOfAttribute(attribute);

        for (const attr of [attribute, ...predecessors]) {
            await this.setPeerDeletionInfoOfOwnRelationshipAttribute(attr, deletionInfo, overrideDeletedOrToBeDeleted);
        }
    }

    public async setPeerDeletionInfoOfReceivedAttributeAndPredecessors(
        attribute: PeerIdentityAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute,
        deletionInfo: ReceivedAttributeDeletionInfo | undefined,
        overrideDeletedOrToBeDeleted = false
    ): Promise<void> {
        const predecessors = await this.getPredecessorsOfAttribute(attribute);

        for (const attr of [attribute, ...predecessors]) {
            await this.setPeerDeletionInfoOfReceivedAttribute(attr, deletionInfo, overrideDeletedOrToBeDeleted);
        }
    }

    public async markAttributeAsViewed(id: CoreId): Promise<LocalAttribute> {
        const localAttributeDoc = await this.attributes.read(id.toString());
        if (!localAttributeDoc) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString());
        }

        const localAttribute = LocalAttribute.from(localAttributeDoc);
        if (localAttribute.wasViewedAt) return localAttribute;

        localAttribute.wasViewedAt = CoreDate.utc();
        await this.attributes.update(localAttributeDoc, localAttribute);

        this.eventBus.publish(new AttributeWasViewedAtChangedEvent(this.identity.address.toString(), localAttribute));

        return localAttribute;
    }

    public async isForwardedTo(attribute: LocalAttribute, peer: CoreAddress, excludeToBeDeleted = false): Promise<boolean> {
        const forwardingDetails = await this.forwardingDetails.find({
            attributeId: attribute.id.toString(),
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        });

        if (forwardingDetails.length === 0) return false;

        if (!excludeToBeDeleted) return true;

        return forwardingDetails.some((details) => details.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByRecipient);
    }

    public async getForwardingDetailsNotDeletedByRecipient(attribute: LocalAttribute, peer: CoreAddress): Promise<ForwardingDetails | undefined> {
        const existingForwardingDetails = await this.forwardingDetails.find({
            attributeId: attribute.id.toString(),
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        });

        if (existingForwardingDetails.length === 0) return undefined;
        return ForwardingDetails.from(existingForwardingDetails[0]);
    }

    public async upsertForwardingDetailsForPeer(attribute: LocalAttribute, peer: CoreAddress, forwardingDetails: ForwardingDetails): Promise<void> {
        const existingForwardingDetails = await this.forwardingDetails.find({
            attributeId: attribute.id.toString(),
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        });

        if (existingForwardingDetails.length === 0) {
            await this.forwardingDetails.create(forwardingDetails);
            await this.updateNumberOfForwards(attribute);
            return;
        }

        await this.forwardingDetails.update(existingForwardingDetails[0], forwardingDetails);
    }

    private async updateNumberOfForwards(attribute: LocalAttribute): Promise<void> {
        const count = await this.forwardingDetails.count({ [nameof<ForwardingDetails>((c) => c.attributeId)]: attribute.id.toString() });
        attribute.numberOfForwards = count;
    }

    public async getForwardingPeers(attribute: LocalAttribute, includeToBeDeleted = false): Promise<CoreAddress[]> {
        const existingForwardingDetailsDocs = await this.forwardingDetails.find({
            attributeId: attribute.id.toString(),
            "deletionInfo.deletionStatus": { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient }
        });
        const existingForwardingDetails = existingForwardingDetailsDocs.map((doc) => ForwardingDetails.from(doc));

        if (existingForwardingDetails.length === 0) return [];

        const forwardingDetails = includeToBeDeleted
            ? existingForwardingDetails
            : existingForwardingDetails.filter((details) => {
                  return details.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByRecipient;
              });

        const peers = forwardingDetails.map((details) => details.peer.toString());
        const uniquePeers = Array.from(new Set(peers)).map((address) => CoreAddress.from(address));
        return uniquePeers;
    }

    public async hasDeletionStatusUnequalDeletedByRecipient(localAttribute: LocalAttribute, peer: CoreAddress): Promise<boolean> {
        const deletionStatuses = [
            EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
            EmittedAttributeDeletionStatus.DeletionRequestSent,
            EmittedAttributeDeletionStatus.DeletionRequestRejected
        ];

        const found = await this.forwardingDetails.find({
            attributeId: localAttribute.id.toString(),
            peer: peer.toString(),
            "deletionInfo.deletionStatus": { $in: deletionStatuses }
        });

        return found.length > 0;
    }

    public async isDeletedOrToBeDeletedByForwardingPeer(localAttribute: LocalAttribute, peer: CoreAddress): Promise<boolean> {
        const docs = await this.forwardingDetails.find({ attributeId: localAttribute.id.toString(), peer: peer.toString() });
        const forwardingDetailsWithPeer = docs.map((doc) => ForwardingDetails.from(doc));

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByRecipient, EmittedAttributeDeletionStatus.ToBeDeletedByRecipient];

        const hasSharingDetailsWithDeletionStatus = forwardingDetailsWithPeer.some(
            (details) => details.deletionInfo && deletionStatuses.includes(details.deletionInfo.deletionStatus)
        );
        const hasSharingDetailsWithoutDeletionStatus = forwardingDetailsWithPeer.some(
            (details) => !details.deletionInfo || !deletionStatuses.includes(details.deletionInfo.deletionStatus)
        );
        return hasSharingDetailsWithDeletionStatus && !hasSharingDetailsWithoutDeletionStatus;
    }

    public async setDeletionInfoForForwardingPeer(
        localAttribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute,
        deletionInfo: EmittedAttributeDeletionInfo | undefined,
        peer: CoreAddress,
        overrideDeleted = false
    ): Promise<void> {
        const query: any = { attributeId: localAttribute.id.toString(), peer: peer.toString() };

        if (!overrideDeleted) query["deletionInfo.deletionStatus"] = { $ne: EmittedAttributeDeletionStatus.DeletedByRecipient };

        const doc = await this.forwardingDetails.findOne(query);

        if (!doc) throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(localAttribute.id, peer);

        const forwardingDetails = ForwardingDetails.from(doc);
        forwardingDetails.deletionInfo = deletionInfo;

        await this.forwardingDetails.update(doc, forwardingDetails);
    }

    public async getForwardingDetailsForAttribute(attribute: LocalAttribute): Promise<ForwardingDetails[]> {
        const docs = await this.forwardingDetails.find({ attributeId: attribute.id.toString() });
        return docs.map((doc) => ForwardingDetails.from(doc));
    }

    public async getLocalAttributesExchangedWithPeer(peer: CoreAddress, query: any, hideTechnical = false, onlyForwarded = false): Promise<LocalAttribute[]> {
        const forwardingDetailsDocs = await this.forwardingDetails.find({ peer: peer.toString() });
        const forwardingDetails = forwardingDetailsDocs.map((doc) => ForwardingDetails.from(doc));

        const attributeIds = forwardingDetails.map((details) => CoreId.from(details.attributeId));
        const uniqueAttributeIds = Array.from(new Set(attributeIds.map((id) => id.toString()))).map((id) => CoreId.from(id));

        if (onlyForwarded) {
            query.id = { $in: uniqueAttributeIds.map((id) => id.toString()) };
        } else {
            query.$or = [
                {
                    id: { $in: uniqueAttributeIds.map((id) => id.toString()) }
                },
                {
                    peer: peer.toString()
                }
            ];
        }

        const docs = await this.attributes.find(this.addHideTechnicalToQuery(query, hideTechnical));

        return docs.map((doc) => LocalAttribute.from(doc));
    }
}
