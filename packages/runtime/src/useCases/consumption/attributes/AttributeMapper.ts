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
        return {
            "@type": this.toType(attribute),
            id: attribute.id.toString(),
            content: attribute.content.toJSON(),
            createdAt: attribute.createdAt.toString(),
            succeeds: attribute.succeeds?.toString(),
            succeededBy: attribute.succeededBy?.toString(),
            wasViewedAt: attribute.wasViewedAt?.toString(),
            isDefault: attribute instanceof OwnIdentityAttribute ? attribute.isDefault : undefined,
            peerSharingInfo: this.toPeerSharingInfo(attribute),
            forwardedSharingInfos: this.toForwardedSharingInfos(attribute)
        };
    }

    public static toAttributeDTOList(attributes: LocalAttribute[]): LocalAttributeDTO[] {
        return attributes.map((attribute) => this.toAttributeDTO(attribute));
    }

    private static toType(attribute: LocalAttribute) {
        if (attribute instanceof OwnIdentityAttribute) return "OwnIdentityAttribute";
        if (attribute instanceof PeerIdentityAttribute) return "PeerIdentityAttribute";
        if (attribute instanceof OwnRelationshipAttribute) return "OwnRelationshipAttribute";
        if (attribute instanceof PeerRelationshipAttribute) return "PeerRelationshipAttribute";
        if (attribute instanceof ThirdPartyRelationshipAttribute) return "ThirdPartyRelationshipAttribute";
        throw new Error("Type of LocalAttribute not found.");
    }

    private static toPeerSharingInfo(attribute: LocalAttribute) {
        if (!("peerSharingInfo" in attribute)) return undefined;

        return (attribute as AttributeWithPeerSharingInfo).peerSharingInfo.toJSON() as PeerSharingInfoDTO;
    }

    private static toForwardedSharingInfos(attribute: LocalAttribute) {
        if (!("forwardedSharingInfos" in attribute)) return undefined;

        return (attribute as AttributeWithForwardedSharingInfos).forwardedSharingInfos?.map((sharingInfo) => sharingInfo.toJSON()) as ForwardedSharingInfosDTO[];
    }
}
