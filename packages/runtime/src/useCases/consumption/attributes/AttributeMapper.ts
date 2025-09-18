import { AttributeWithPeerSharingDetails, ForwardableAttribute, LocalAttribute, OwnIdentityAttribute } from "@nmshd/consumption";
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

    private static toPeerSharingDetails(attribute: LocalAttribute) {
        if (!("peerSharingDetails" in attribute)) return undefined;

        return (attribute as AttributeWithPeerSharingDetails).peerSharingDetails.toJSON() as PeerSharingDetailsDTO;
    }

    private static toForwardedSharingDetails(attribute: LocalAttribute) {
        if (!("forwardedSharingDetails" in attribute)) return undefined;

        return (attribute as ForwardableAttribute).forwardedSharingDetails?.map((sharingDetails) => sharingDetails.toJSON()) as ForwardedSharingDetailsDTO[];
    }
}
