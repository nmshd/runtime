import { LocalAttributeDTO } from "../../../types";

export interface AttributeSuccessionResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}
