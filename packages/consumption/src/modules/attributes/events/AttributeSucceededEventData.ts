import { LocalAttribute } from "../local/attributeTypes";

export interface AttributeSucceededEventData {
    predecessor: LocalAttribute;
    successor: LocalAttribute;
}
