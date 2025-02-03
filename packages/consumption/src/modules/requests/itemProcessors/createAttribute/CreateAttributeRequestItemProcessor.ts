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
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { LocalAttribute, LocalAttributeShareInfo } from "../../../attributes";
import { ValidationResult } from "../../../common/ValidationResult";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class CreateAttributeRequestItemProcessor extends GenericRequestItemProcessor<CreateAttributeRequestItem> {
    public override async canCreateOutgoingRequestItem(requestItem: CreateAttributeRequestItem, _request?: Request, recipient?: CoreAddress): Promise<ValidationResult> {
        const recipientIsAttributeOwner = requestItem.attribute.owner.equals(recipient);
        const senderIsAttributeOwner = requestItem.attribute.owner.equals(this.currentIdentityAddress);
        const ownerIsEmptyString = requestItem.attribute.owner.toString() === "";

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
        const lastestSharedVersion = await this.getLastestSharedVersionOfRepositoryAttribute(repositoryAttribute.id, requestInfo.peer);

        if (!lastestSharedVersion) {
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

        if (lastestSharedVersion.shareInfo!.sourceAttribute!.equals(repositoryAttribute.id)) {
            return AttributeAlreadySharedAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: lastestSharedVersion.id
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
            lastestSharedVersion.id,
            ownSharedIdentityAttributeSuccessorParams
        );
        const succeededOwnSharedIdentityAttribute = ownSharedIdentityAttributesAfterSuccession.successor;

        return AttributeSuccessionAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            successorId: succeededOwnSharedIdentityAttribute.id,
            successorContent: succeededOwnSharedIdentityAttribute.content,
            predecessorId: lastestSharedVersion.id
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

        const succeededRepositoryAttribute = await this.mergeTagsOfRespositoryAttribute(existingRepositoryAttribute, newTags);
        return succeededRepositoryAttribute;
    }

    private async mergeTagsOfRespositoryAttribute(existingRepositoryAttribute: LocalAttribute, newTags: string[]): Promise<LocalAttribute> {
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

    private async getLastestSharedVersionOfRepositoryAttribute(attributeId: CoreId, peer: CoreAddress): Promise<LocalAttribute | undefined> {
        const sharedVersions = await this.consumptionController.attributes.getSharedVersionsOfAttribute(attributeId, [peer]);
        if (sharedVersions.length === 0) return;
        return sharedVersions[0];
    }

    public override async applyIncomingResponseItem(
        responseItem: CreateAttributeAcceptResponseItem | RejectResponseItem,
        requestItem: CreateAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof CreateAttributeAcceptResponseItem)) {
            return;
        }

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
}
