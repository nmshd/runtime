import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    CreateAttributeAcceptResponseItem,
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ResponseItemResult
} from "@nmshd/content";
import { AttributesController, LocalAttribute, LocalAttributeDeletionStatus, LocalAttributeShareInfo } from "../../../attributes";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export default async function createAppropriateResponseItem(
    identityAttribute: IdentityAttribute,
    requestInfo: LocalRequestInfo,
    attributesController: AttributesController,
    itemType: "Create"
): Promise<CreateAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem>;
export default async function createAppropriateResponseItem(
    identityAttribute: IdentityAttribute,
    requestInfo: LocalRequestInfo,
    attributesController: AttributesController,
    itemType: "Read"
): Promise<ReadAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem>;
export default async function createAppropriateResponseItem(
    identityAttribute: IdentityAttribute,
    requestInfo: LocalRequestInfo,
    attributesController: AttributesController,
    itemType: "Create" | "Read"
): Promise<CreateAttributeAcceptResponseItem | ReadAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
    const repositoryAttribute = await getSourceRepositoryAttribute(identityAttribute, attributesController);

    const query = {
        "deletionInfo.deletionStatus": {
            $nin: [
                LocalAttributeDeletionStatus.DeletedByPeer,
                LocalAttributeDeletionStatus.DeletedByOwner,
                LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                LocalAttributeDeletionStatus.ToBeDeleted
            ]
        }
    };
    const latestSharedVersions = await attributesController.getSharedVersionsOfAttribute(repositoryAttribute.id, [requestInfo.peer], true, query);
    const latestSharedVersion = latestSharedVersions.length > 0 ? latestSharedVersions[0] : undefined;

    if (!latestSharedVersion) {
        const newOwnSharedIdentityAttribute = await attributesController.createSharedLocalAttributeCopy({
            peer: requestInfo.peer,
            requestReference: requestInfo.id,
            sourceAttributeId: repositoryAttribute.id
        });

        switch (itemType) {
            case "Create":
                return CreateAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: newOwnSharedIdentityAttribute.id
                });
            case "Read":
                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: newOwnSharedIdentityAttribute.id,
                    attribute: newOwnSharedIdentityAttribute.content
                });
        }
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
    const ownSharedIdentityAttributesAfterSuccession = await attributesController.succeedOwnSharedIdentityAttribute(
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

async function getSourceRepositoryAttribute(attribute: IdentityAttribute, attributesController: AttributesController): Promise<LocalAttribute> {
    const existingRepositoryAttribute = await attributesController.getRepositoryAttributeWithSameValue((attribute.value as any).toJSON());

    if (!existingRepositoryAttribute) {
        return await attributesController.createRepositoryAttribute({
            content: attribute
        });
    }

    const newTags = attribute.tags?.filter((tag) => !(existingRepositoryAttribute.content as IdentityAttribute).tags?.includes(tag));
    if (!newTags || newTags.length === 0) return existingRepositoryAttribute;

    const succeededRepositoryAttribute = await mergeTagsOfRepositoryAttribute(existingRepositoryAttribute, newTags, attributesController);
    return succeededRepositoryAttribute;
}

async function mergeTagsOfRepositoryAttribute(existingRepositoryAttribute: LocalAttribute, newTags: string[], attributesController: AttributesController): Promise<LocalAttribute> {
    const repositoryAttributeSuccessorParams = {
        content: {
            ...existingRepositoryAttribute.content.toJSON(),
            tags: [...((existingRepositoryAttribute.content as IdentityAttribute).tags ?? []), ...newTags]
        },
        succeeds: existingRepositoryAttribute.id.toString()
    };

    const repositoryAttributesAfterSuccession = await attributesController.succeedRepositoryAttribute(existingRepositoryAttribute.id, repositoryAttributeSuccessorParams);

    return repositoryAttributesAfterSuccession.successor;
}
