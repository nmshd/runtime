import { LocalAttributeListener } from "@nmshd/consumption";
import { LocalAttributeListenerDTO } from "../../../types";

export class AttributeListenerMapper {
    public static toAttributeListenerDTO(attribute: LocalAttributeListener): LocalAttributeListenerDTO {
        return {
            id: attribute.id.toString(),
            query: attribute.query.toJSON(),
            peer: attribute.peer.toString()
        };
    }

    public static toAttributeListenerDTOList(attributes: LocalAttributeListener[]): LocalAttributeListenerDTO[] {
        return attributes.map((attribute) => this.toAttributeListenerDTO(attribute));
    }
}
