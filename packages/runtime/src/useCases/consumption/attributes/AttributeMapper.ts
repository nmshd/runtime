import {
    AttributeWithForwardedSharingInfos,
    AttributeWithPeerSharingInfo,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute
} from "@nmshd/consumption";
import { ForwardedSharingInfosDTO, LocalAttributeDTO, PeerSharingInfoDTO } from "@nmshd/runtime-types";

export class AttributeMapper {
    public static toAttributeDTO(attribute: LocalAttribute): LocalAttributeDTO {
        // TODO: make this prettier
        return {
            "@type": AttributeMapper.getType(attribute),
            id: attribute.id.toString(),
            content: attribute.content.toJSON(),
            createdAt: attribute.createdAt.toString(),
            succeeds: attribute.succeeds?.toString(),
            succeededBy: attribute.succeededBy?.toString(),
            wasViewedAt: attribute.wasViewedAt?.toString(),
            isDefault: attribute instanceof OwnIdentityAttribute ? attribute.isDefault : undefined,
            peerSharingInfo: "peerSharingInfo" in attribute ? ((attribute as AttributeWithPeerSharingInfo).peerSharingInfo?.toJSON() as PeerSharingInfoDTO) : undefined,
            forwardedSharingInfos:
                "forwardedSharingInfos" in attribute
                    ? ((attribute as AttributeWithForwardedSharingInfos).forwardedSharingInfos?.map((sharingInfo) => sharingInfo.toJSON()) as ForwardedSharingInfosDTO[])
                    : undefined
        };
    }

    public static toAttributeDTOList(attributes: LocalAttribute[]): LocalAttributeDTO[] {
        return attributes.map((attribute) => this.toAttributeDTO(attribute));
    }

    private static getType(attribute: LocalAttribute) {
        if (attribute instanceof OwnIdentityAttribute) return "OwnIdentityAttribute";
        if (attribute instanceof PeerIdentityAttribute) return "PeerIdentityAttribute";
        if (attribute instanceof OwnRelationshipAttribute) return "OwnRelationshipAttribute";
        if (attribute instanceof PeerRelationshipAttribute) return "PeerRelationshipAttribute";
        if (attribute instanceof ThirdPartyRelationshipAttribute) return "ThirdPartyRelationshipAttribute";
        throw Error; // TODO:
    }
}
