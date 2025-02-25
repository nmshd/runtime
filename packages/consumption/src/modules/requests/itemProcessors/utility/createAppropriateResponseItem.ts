import { AttributeAlreadySharedAcceptResponseItem, AttributeSuccessionAcceptResponseItem, IdentityAttribute, ResponseItemResult } from "@nmshd/content";
import { AttributesController, LocalAttribute, LocalAttributeShareInfo } from "../../../attributes";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export async function getSourceRepositoryAttribute(attribute: IdentityAttribute, attributesController: AttributesController): Promise<LocalAttribute> {
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

export async function foo(
    repositoryAttribute: LocalAttribute,
    latestSharedVersion: LocalAttribute,
    requestInfo: LocalRequestInfo,
    attributesController: AttributesController
): Promise<AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
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
