import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    CreateAttributeAcceptResponseItem,
    IdentityAttribute,
    ProposeAttributeAcceptResponseItem,
    ReadAttributeAcceptResponseItem,
    ResponseItemResult
} from "@nmshd/content";
import { AttributesController, OwnIdentityAttribute } from "../../../attributes";
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

    const latestSharedVersions = await attributesController.getVersionsOfAttributeSharedWithPeer(ownIdentityAttribute, requestInfo.peer);
    const latestSharedVersion = latestSharedVersions.length > 0 ? latestSharedVersions[0] : undefined;

    if (!latestSharedVersion) {
        const updatedAttribute = await attributesController.addForwardingDetailsToAttribute(ownIdentityAttribute, requestInfo.peer, requestInfo.id);

        switch (itemType) {
            case "Create":
                return CreateAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: updatedAttribute.id
                });
            case "Read":
                return ReadAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownIdentityAttribute.id,
                    attribute: updatedAttribute.content
                });
            case "Propose":
                return ProposeAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: ownIdentityAttribute.id,
                    attribute: updatedAttribute.content
                });
        }
    }

    if (latestSharedVersion.id.equals(ownIdentityAttribute.id)) {
        const deletionStatus = await attributesController.getForwardingDetailsNotDeletedByRecipient(latestSharedVersion, requestInfo.peer);
        if (deletionStatus) {
            await attributesController.setForwardedDeletionInfoOfAttribute(latestSharedVersion, undefined, requestInfo.peer, true);
        }

        return AttributeAlreadySharedAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: latestSharedVersion.id
        });
    }

    const updatedAttribute = await attributesController.addForwardingDetailsToAttribute(ownIdentityAttribute, requestInfo.peer, requestInfo.id);

    return AttributeSuccessionAcceptResponseItem.from({
        result: ResponseItemResult.Accepted,
        successorId: updatedAttribute.id,
        successorContent: updatedAttribute.content,
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
    const ownIdentityAttributeSuccessorParams = {
        content: {
            ...ownIdentityAttribute.content.toJSON(),
            tags: [...(ownIdentityAttribute.content.tags ?? []), ...newTags]
        },
        succeeds: ownIdentityAttribute.id.toString()
    };

    const ownIdentityAttributesAfterSuccession = await attributesController.succeedOwnIdentityAttribute(ownIdentityAttribute, ownIdentityAttributeSuccessorParams);
    return ownIdentityAttributesAfterSuccession.successor;
}
