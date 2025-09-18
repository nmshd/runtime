import { AttributeWithPeerSharingDetails } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/AttributeWithPeerSharingDetails";
import { ForwardableAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/ForwardableAttribute";
import { LocalAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/LocalAttribute";
import { OwnIdentityAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/OwnIdentityAttribute";
import { OwnRelationshipAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/OwnRelationshipAttribute";
import { PeerIdentityAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/PeerIdentityAttribute";
import { PeerRelationshipAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/PeerRelationshipAttribute";
import { ThirdPartyRelationshipAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/ThirdPartyRelationshipAttribute";
import { ForwardedSharingDetailsDTO, LocalAttributeDTO, PeerSharingDetailsDTO } from "@nmshd/runtime-types";

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
            peerSharingDetails: this.toPeerSharingDetails(attribute),
            forwardedSharingDetails: this.toForwardedSharingDetails(attribute)
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

    private static toPeerSharingDetails(attribute: LocalAttribute) {
        if (!("peerSharingDetails" in attribute)) return undefined;

        return (attribute as AttributeWithPeerSharingDetails).peerSharingDetails.toJSON() as PeerSharingDetailsDTO;
    }

    private static toForwardedSharingDetails(attribute: LocalAttribute) {
        if (!("forwardedSharingDetails" in attribute)) return undefined;

        return (attribute as ForwardableAttribute).forwardedSharingDetails?.map((sharingDetails) => sharingDetails.toJSON()) as ForwardedSharingDetailsDTO[];
    }
}
