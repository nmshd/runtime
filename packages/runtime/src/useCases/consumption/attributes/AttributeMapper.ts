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

        return attribute.forwardedSharingDetails?.map((detail) => this.toForwardedSharingDetailsDTO(detail));
    }

    private static toForwardedSharingDetailsDTO(detail: ForwardedSharingDetails): ForwardedSharingDetailsDTO {
        return {
            peer: detail.peer.toString(),
            sourceReference: detail.sourceReference.toString(),
            sharedAt: detail.sharedAt.toString(),
            deletionInfo: detail.deletionInfo ? { deletionStatus: detail.deletionInfo.deletionStatus, deletionDate: detail.deletionInfo.deletionDate.toString() } : undefined
        };
    }
}
