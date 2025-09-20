import {
    ForwardedSharingDetails,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeSharingDetails
} from "@nmshd/consumption";
import { ForwardedSharingDetailsDTO, LocalAttributeDTO, PeerSharingDetailsDTO } from "@nmshd/runtime-types";

export class AttributeMapper {
    public static toAttributeDTO(attribute: LocalAttribute): LocalAttributeDTO {
        return {
            "@type": (attribute.constructor as any).name,
            id: attribute.id.toString(),
            content: attribute.content.toJSON(),
            createdAt: attribute.createdAt.toString(),
            succeeds: attribute.succeeds?.toString(),
            succeededBy: attribute.succeededBy?.toString(),
            wasViewedAt: attribute.wasViewedAt?.toString(),
            isDefault: attribute instanceof OwnIdentityAttribute ? attribute.isDefault : undefined,
            peerSharingDetails: this.toPeerSharingDetails(attribute),
            forwardedSharingDetails: this.toForwardedSharingDetails(attribute)
        };
    }

    public static toAttributeDTOList(attributes: LocalAttribute[]): LocalAttributeDTO[] {
        return attributes.map((attribute) => this.toAttributeDTO(attribute));
    }

    private static toPeerSharingDetails(attribute: LocalAttribute): PeerSharingDetailsDTO | undefined {
        if (
            !(
                attribute instanceof OwnRelationshipAttribute ||
                attribute instanceof PeerRelationshipAttribute ||
                attribute instanceof PeerIdentityAttribute ||
                attribute instanceof ThirdPartyRelationshipAttribute
            )
        ) {
            return undefined;
        }

        return {
            peer: attribute.peerSharingDetails.peer.toString(),
            sourceReference: attribute.peerSharingDetails.sourceReference.toString(),
            deletionInfo: attribute.peerSharingDetails.deletionInfo
                ? { deletionStatus: attribute.peerSharingDetails.deletionInfo.deletionStatus, deletionDate: attribute.peerSharingDetails.deletionInfo.deletionDate.toString() }
                : undefined,
            initialAttributePeer:
                attribute.peerSharingDetails instanceof ThirdPartyRelationshipAttributeSharingDetails ? attribute.peerSharingDetails.initialAttributePeer.toString() : undefined
        };
    }

    private static toForwardedSharingDetails(attribute: LocalAttribute): ForwardedSharingDetailsDTO[] | undefined {
        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) return undefined;

        return attribute.forwardedSharingDetails?.map((sharingDetails) => this.toForwardedSharingDetailsDTO(sharingDetails));
    }

    private static toForwardedSharingDetailsDTO(sharingDetails: ForwardedSharingDetails): ForwardedSharingDetailsDTO {
        return {
            peer: sharingDetails.peer.toString(),
            sourceReference: sharingDetails.sourceReference.toString(),
            sharedAt: sharingDetails.sharedAt.toString(),
            deletionInfo: sharingDetails.deletionInfo
                ? { deletionStatus: sharingDetails.deletionInfo.deletionStatus, deletionDate: sharingDetails.deletionInfo.deletionDate.toString() }
                : undefined
        };
    }
}
