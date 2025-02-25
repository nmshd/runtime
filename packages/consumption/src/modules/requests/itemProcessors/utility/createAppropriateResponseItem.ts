import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    CreateAttributeAcceptResponseItem,
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ResponseItemResult
} from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AttributesController, LocalAttribute, LocalAttributeShareInfo } from "../../../attributes";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export default async function createAppropriateResponseItem(
    attribute: IdentityAttribute,
    requestInfo: LocalRequestInfo,
    attributesController: AttributesController,
    requestItemKind: "Create" | "Read"
): Promise<CreateAttributeAcceptResponseItem | ReadAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem> {
    const repositoryAttribute = await getSourceRepositoryAttribute(attribute, attributesController);

    const latestSharedVersions = await attributesController.getSharedVersionsOfAttribute(repositoryAttribute.id, [requestInfo.peer]);
    const latestSharedVersion = latestSharedVersions.length > 0 ? latestSharedVersions[0] : undefined;

    if (!latestSharedVersion) {
        const newOwnSharedIdentityAttribute = await attributesController.createSharedLocalAttributeCopy({
            peer: requestInfo.peer,
            requestReference: requestInfo.id,
            sourceAttributeId: repositoryAttribute.id
        });

        return getNativeAcceptResponseItem(requestItemKind, newOwnSharedIdentityAttribute.id, newOwnSharedIdentityAttribute.content as IdentityAttribute);
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

function getNativeAcceptResponseItem(requestItemKind: "Create", attributeId: CoreId, attribute: IdentityAttribute): CreateAttributeAcceptResponseItem;
function getNativeAcceptResponseItem(requestItemKind: "Read", attributeId: CoreId, attribute: IdentityAttribute): ReadAttributeAcceptResponseItem;
function getNativeAcceptResponseItem(
    requestItemKind: "Create" | "Read",
    attributeId: CoreId,
    attribute: IdentityAttribute
): CreateAttributeAcceptResponseItem | ReadAttributeAcceptResponseItem {
    switch (requestItemKind) {
        case "Create":
            return CreateAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId
            });
        case "Read":
            return ReadAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId,
                attribute
            });
        default:
            // TODO:
            throw new Error();
    }
}
