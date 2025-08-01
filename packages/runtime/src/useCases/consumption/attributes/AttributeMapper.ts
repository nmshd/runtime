import { AttributeWithForwardedSharingInfos, AttributeWithPeerSharingInfo, LocalAttribute, OwnIdentityAttribute } from "@nmshd/consumption";
import { ForwardedSharingInfosDTO, LocalAttributeDTO, PeerSharingInfoDTO } from "@nmshd/runtime-types";

export class AttributeMapper {
    public static toAttributeDTO(attribute: LocalAttribute): LocalAttributeDTO {
        return {
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
}
