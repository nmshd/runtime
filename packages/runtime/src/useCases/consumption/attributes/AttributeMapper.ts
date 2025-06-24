import { LocalAttribute, LocalAttributeDeletionInfoJSON, LocalAttributeShareInfoJSON } from "@nmshd/consumption";
import { LocalAttributeDTO } from "../../../types";

export class AttributeMapper {
    public static toAttributeDTO(attribute: LocalAttribute): LocalAttributeDTO {
        return {
            id: attribute.id.toString(),
            parentId: attribute.parentId?.toString(),
            content: attribute.content.toJSON(),
            createdAt: attribute.createdAt.toString(),
            succeeds: attribute.succeeds?.toString(),
            succeededBy: attribute.succeededBy?.toString(),
            shareInfo: attribute.shareInfo?.toJSON() as LocalAttributeShareInfoJSON,
            deletionInfo: attribute.deletionInfo?.toJSON() as LocalAttributeDeletionInfoJSON,
            isDefault: attribute.isDefault,
            wasViewedAt: attribute.wasViewedAt?.toString()
        };
    }

    public static toAttributeDTOList(attributes: LocalAttribute[]): LocalAttributeDTO[] {
        return attributes.map((attribute) => this.toAttributeDTO(attribute));
    }
}
