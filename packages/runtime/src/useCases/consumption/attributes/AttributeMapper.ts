import {
    AttributeForwardingDetails,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute
} from "@nmshd/consumption";
import { LocalAttributeDTO, LocalAttributeForwardingDetailsDTO } from "@nmshd/runtime-types";

export class AttributeMapper {
    public static toAttributeDTO(attribute: LocalAttribute): LocalAttributeDTO {
        const attributeIsShared =
            attribute instanceof OwnRelationshipAttribute ||
            attribute instanceof PeerRelationshipAttribute ||
            attribute instanceof PeerIdentityAttribute ||
            attribute instanceof ThirdPartyRelationshipAttribute;

        return {
            "@type": (attribute.constructor as any).name,
            id: attribute.id.toString(),
            content: attribute.content.toJSON(),
            createdAt: attribute.createdAt.toString(),
            succeeds: attribute.succeeds?.toString(),
            succeededBy: attribute.succeededBy?.toString(),
            wasViewedAt: attribute.wasViewedAt?.toString(),
            isDefault: attribute instanceof OwnIdentityAttribute ? attribute.isDefault : undefined,
            peer: attributeIsShared ? attribute.peer.toString() : undefined,
            sourceReference: attributeIsShared ? attribute.sourceReference.toString() : undefined,
            deletionInfo:
                attributeIsShared && attribute.deletionInfo
                    ? { deletionStatus: attribute.deletionInfo.deletionStatus, deletionDate: attribute.deletionInfo.deletionDate.toString() }
                    : undefined,
            initialAttributePeer: attribute instanceof ThirdPartyRelationshipAttribute ? attribute.initialAttributePeer.toString() : undefined,
            numberOfForwards: attribute.numberOfForwards
        };
    }

    public static toAttributeDTOList(attributes: LocalAttribute[]): LocalAttributeDTO[] {
        return attributes.map((attribute) => this.toAttributeDTO(attribute));
    }

    public static toForwardingDetailsDTO(forwardingDetails: AttributeForwardingDetails): LocalAttributeForwardingDetailsDTO {
        return {
            peer: forwardingDetails.peer.toString(),
            sourceReference: forwardingDetails.sourceReference.toString(),
            sharedAt: forwardingDetails.sharedAt.toString(),
            deletionInfo: forwardingDetails.deletionInfo
                ? { deletionStatus: forwardingDetails.deletionInfo.deletionStatus, deletionDate: forwardingDetails.deletionInfo.deletionDate.toString() }
                : undefined
        };
    }
}
