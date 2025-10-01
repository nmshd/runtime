import {
    ForwardedSharingDetails,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute
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
            peer: attribute.peer.toString(),
            sourceReference: attribute.sourceReference.toString(),
            deletionInfo: attribute.deletionInfo
                ? { deletionStatus: attribute.deletionInfo.deletionStatus, deletionDate: attribute.deletionInfo.deletionDate.toString() }
                : undefined,
            initialAttributePeer: attribute instanceof ThirdPartyRelationshipAttribute ? attribute.initialAttributePeer.toString() : undefined
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
