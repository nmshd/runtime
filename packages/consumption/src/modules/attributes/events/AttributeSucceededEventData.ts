import { LocalAttribute } from "../local/LocalAttribute";

export interface AttributeSucceededEventData {
    predecessor: LocalAttribute;
    successor: LocalAttribute;
}
