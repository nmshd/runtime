import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    CreateAttributeAcceptResponseItem,
    IdentityAttribute,
    ProposeAttributeAcceptResponseItem,
    ReadAttributeAcceptResponseItem,
    ResponseItemResult
} from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { AttributesController, OwnIdentityAttribute, OwnIdentityAttributeSharingInfo } from "../../../attributes";
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
    itemType: "Propose"
): Promise<ProposeAttributeAcceptResponseItem | AttributeAlreadySharedAcceptResponseItem | AttributeSuccessionAcceptResponseItem>;
export default async function createAppropriateResponseItem(
    identityAttribute: IdentityAttribute,
    requestInfo: LocalRequestInfo,
    attributesController: AttributesController,
    itemType: "Create" | "Read" | "Propose"
): Promise<
    | CreateAttributeAcceptResponseItem
    | ReadAttributeAcceptResponseItem
    | ProposeAttributeAcceptResponseItem
    | AttributeAlreadySharedAcceptResponseItem
    | AttributeSuccessionAcceptResponseItem
> {
    const ownIdentityAttribute = await getOwnIdentityAttribute(identityAttribute, attributesController);

    const latestSharedVersions = await attributesController.getSharedVersionsOfAttribute(ownIdentityAttribute, requestInfo.peer);
    const latestSharedVersion = latestSharedVersions.length > 0 ? latestSharedVersions[0] : undefined;

    if (!latestSharedVersion) {
        await attributesController.addSharingInfoToOwnIdentityAttribute(ownIdentityAttribute, requestInfo.peer, requestInfo.id);

        switch (itemType) {
            case "Create":
                return CreateAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownIdentityAttribute.id
                });
            case "Read":
                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownIdentityAttribute.id,
                    attribute: ownIdentityAttribute.content
                });
            case "Propose":
                return ProposeAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownIdentityAttribute.id,
                    attribute: ownIdentityAttribute.content
                });
        }
    }

    if (latestSharedVersion.id.equals(ownIdentityAttribute.id)) {
        return AttributeAlreadySharedAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: latestSharedVersion.id
        });
    }

    const ownIdentityAttributeSuccessorParams = {
        content: ownIdentityAttribute.content,
        sharingInfo: OwnIdentityAttributeSharingInfo.from({
            peer: requestInfo.peer,
            sourceReference: requestInfo.id,
            sharedAt: CoreDate.utc()
        })
    };
    const ownIdentityAttributesAfterSuccession = await attributesController.succeedOwnIdentityAttribute(latestSharedVersion, ownIdentityAttributeSuccessorParams);
    const succeededOwnIdentityAttribute = ownIdentityAttributesAfterSuccession.successor;

    return AttributeSuccessionAcceptResponseItem.from({
        result: ResponseItemResult.Accepted,
        successorId: succeededOwnIdentityAttribute.id,
        successorContent: succeededOwnIdentityAttribute.content,
        predecessorId: latestSharedVersion.id
    });
}

async function getOwnIdentityAttribute(attribute: IdentityAttribute, attributesController: AttributesController): Promise<OwnIdentityAttribute> {
    const existingOwnIdentityAttribute = await attributesController.getOwnIdentityAttributeWithSameValue((attribute.value as any).toJSON());

    if (!existingOwnIdentityAttribute) {
        return await attributesController.createOwnIdentityAttribute({ content: attribute });
    }

    const newTags = attribute.tags?.filter((tag) => !existingOwnIdentityAttribute.content.tags?.includes(tag));
    if (!newTags || newTags.length === 0) return existingOwnIdentityAttribute;

    const succeededOwnIdentityAttribute = await mergeTagsOfOwnIdentityAttribute(existingOwnIdentityAttribute, newTags, attributesController);
    return succeededOwnIdentityAttribute;
}

async function mergeTagsOfOwnIdentityAttribute(
    ownIdentityAttribute: OwnIdentityAttribute,
    newTags: string[],
    attributesController: AttributesController
): Promise<OwnIdentityAttribute> {
    const repositoryAttributeSuccessorParams = {
        content: {
            ...ownIdentityAttribute.content.toJSON(),
            tags: [...(ownIdentityAttribute.content.tags ?? []), ...newTags]
        },
        succeeds: ownIdentityAttribute.id.toString()
    };

    const ownIdentityAttributesAfterSuccession = await attributesController.succeedOwnIdentityAttribute(ownIdentityAttribute, repositoryAttributeSuccessorParams);
    return ownIdentityAttributesAfterSuccession.successor;
}
