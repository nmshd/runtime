import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    IdentityAttribute,
    RejectResponseItem,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AttributeSuccessorParams, LocalAttribute, LocalAttributeDeletionStatus, LocalAttributeShareInfo, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class CreateAttributeRequestItemProcessor extends GenericRequestItemProcessor<CreateAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: CreateAttributeRequestItem, _request?: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const recipientIsAttributeOwner = requestItem.attribute.owner.equals(recipient);
        const senderIsAttributeOwner = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";

        if (!this.consumptionController.attributes.validateAttributeCharacters(requestItem.attribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The Attribute contains forbidden characters."));
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            if (recipientIsAttributeOwner || ownerIsEmptyString) {
                return ValidationResult.success();
            }

            if (senderIsAttributeOwner) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        "Cannot create own IdentityAttributes with a CreateAttributeRequestItem. Use a ShareAttributeRequestItem instead."
                    )
                );
            }

            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The owner of the provided IdentityAttribute for the `attribute` property can only be the address of the recipient or an empty string. The latter will default to the address of the recipient."
                )
            );
        }

        if (!(recipientIsAttributeOwner || senderIsAttributeOwner || ownerIsEmptyString)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.invalidRequestItem(
                    "The owner of the provided RelationshipAttribute for the `attribute` property can only be the address of the sender, the address of the recipient or an empty string. The latter will default to the address of the recipient."
                )
            );
        }

        if (typeof recipient !== "undefined") {
            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.attribute.key,
                ownerIsEmptyString ? recipient : requestItem.attribute.owner,
                requestItem.attribute.value.toJSON()["@type"],
                recipient
            );

            if (relationshipAttributesWithSameKey.length !== 0) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidRequestItem(
                        `The creation of the provided RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.attribute.key}', owner and value type.`
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    public override async canAccept(requestItem: CreateAttributeRequestItem, _params: AcceptRequestItemParametersJSON, requestInfo: LocalRequestInfo): Promise<ValidationResult> {
        if (!this.consumptionController.attributes.validateAttributeCharacters(requestItem.attribute)) {
            throw ConsumptionCoreErrors.attributes.forbiddenCharactersInAttribute("The Attribute contains forbidden characters.");
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";

            const relationshipAttributesWithSameKey = await this.consumptionController.attributes.getRelationshipAttributesOfValueTypeToPeerWithGivenKeyAndOwner(
                requestItem.attribute.key,
                ownerIsEmptyString ? this.currentIdentityAddress : requestItem.attribute.owner,
                requestItem.attribute.value.toJSON()["@type"],
                requestInfo.peer
            );

            if (relationshipAttributesWithSameKey.length !== 0) {
                if (requestItem.mustBeAccepted) {
                    throw ConsumptionCoreErrors.requests.violatedKeyUniquenessOfRelationshipAttributes(
                        `The provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.attribute.key}', owner and value type.`
                    );
                }

                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.invalidAcceptParameters(
                        `This CreateAttributeRequestItem cannot be accepted as the provided RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key '${requestItem.attribute.key}', owner and value type.`
                    )
                );
            }
        }

        return ValidationResult.success();
    }

    public override async accept(
        requestItem: CreateAttributeRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<CreateAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
        if (requestItem.attribute.owner.toString() === "") {
            requestItem.attribute.owner = this.currentIdentityAddress;
        }

        if (requestItem.attribute instanceof RelationshipAttribute) {
            const sharedRelationshipAttribute = await this.consumptionController.attributes.createSharedLocalAttribute({
                content: requestItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            });

            return CreateAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: sharedRelationshipAttribute.id
            });
        }

        const repositoryAttribute = await this.getSourceRepositoryAttribute(requestItem.attribute);

        const query = {
            "deletionInfo.deletionStatus": {
                $nin: [LocalAttributeDeletionStatus.DeletedByPeer, LocalAttributeDeletionStatus.ToBeDeletedByPeer]
            }
        };
        const latestSharedVersions = await this.consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttribute.id, [requestInfo.peer], true, query);
        const latestSharedVersion = latestSharedVersions.length > 0 ? latestSharedVersions[0] : undefined;

        if (!latestSharedVersion) {
            const newOwnSharedIdentityAttribute = await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttributeId: repositoryAttribute.id
            });

            return CreateAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: newOwnSharedIdentityAttribute.id
            });
        }

        if (latestSharedVersion.shareInfo!.sourceAttribute!.equals(repositoryAttribute.id)) {
            return AttributeAlreadySharedAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: latestSharedVersion.id
            });
        }

        const ownSharedIdentityAttributeSuccessorParams = {
            content: repositoryAttribute.content,
            shareInfo: LocalAttributeShareInfo.from({
                peer: requestInfo.peer,
                requestReference: requestInfo.id,
                sourceAttribute: repositoryAttribute.id
            })
        };
        const ownSharedIdentityAttributesAfterSuccession = await this.consumptionController.attributes.succeedOwnSharedIdentityAttribute(
            latestSharedVersion.id,
            ownSharedIdentityAttributeSuccessorParams
        );
        const succeededOwnSharedIdentityAttribute = ownSharedIdentityAttributesAfterSuccession.successor;

        return AttributeSuccessionAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            successorId: succeededOwnSharedIdentityAttribute.id,
            successorContent: succeededOwnSharedIdentityAttribute.content,
            predecessorId: latestSharedVersion.id
        });
    }

    private async getSourceRepositoryAttribute(attribute: IdentityAttribute): Promise<LocalAttribute> {
        const existingRepositoryAttribute = await this.consumptionController.attributes.getRepositoryAttributeWithSameValue((attribute.value as any).toJSON());

        if (!existingRepositoryAttribute) {
            return await this.consumptionController.attributes.createRepositoryAttribute({
                content: attribute
            });
        }

        const newTags = attribute.tags?.filter((tag) => !(existingRepositoryAttribute.content as IdentityAttribute).tags?.includes(tag));
        if (!newTags || newTags.length === 0) return existingRepositoryAttribute;

        const succeededRepositoryAttribute = await this.mergeTagsOfRepositoryAttribute(existingRepositoryAttribute, newTags);
        return succeededRepositoryAttribute;
    }

    private async mergeTagsOfRepositoryAttribute(existingRepositoryAttribute: LocalAttribute, newTags: string[]): Promise<LocalAttribute> {
        const repositoryAttributeSuccessorParams = {
            content: {
                ...existingRepositoryAttribute.content.toJSON(),
                tags: [...((existingRepositoryAttribute.content as IdentityAttribute).tags ?? []), ...newTags]
            },
            succeeds: existingRepositoryAttribute.id.toString()
        };

        const repositoryAttributesAfterSuccession = await this.consumptionController.attributes.succeedRepositoryAttribute(
            existingRepositoryAttribute.id,
            repositoryAttributeSuccessorParams
        );

        return repositoryAttributesAfterSuccession.successor;
    }

    public override async applyIncomingResponseItem(
        responseItem: CreateAttributeAcceptResponseItem | AttributeSuccessionAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | RejectResponseItem,
        requestItem: CreateAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<PeerSharedAttributeSucceededEvent | void> {
        if (responseItem instanceof CreateAttributeAcceptResponseItem) {
            if (requestItem.attribute.owner.toString() === "") {
                requestItem.attribute.owner = requestInfo.peer;
            }

            await this.consumptionController.attributes.createSharedLocalAttribute({
                id: responseItem.attributeId,
                content: requestItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            });
        }

        if (responseItem instanceof AttributeSuccessionAcceptResponseItem && responseItem.successorContent instanceof IdentityAttribute) {
            const successorParams = AttributeSuccessorParams.from({
                id: responseItem.successorId,
                content: responseItem.successorContent,
                shareInfo: LocalAttributeShareInfo.from({
                    peer: requestInfo.peer,
                    requestReference: requestInfo.id
                })
            });
            const { predecessor, successor } = await this.consumptionController.attributes.succeedPeerSharedIdentityAttribute(responseItem.predecessorId, successorParams);
            return new PeerSharedAttributeSucceededEvent(this.currentIdentityAddress.toString(), predecessor, successor);
        }

        return;
    }
}
