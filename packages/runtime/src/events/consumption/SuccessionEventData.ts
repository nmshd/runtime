import { LocalAttributeDTO } from "@nmshd/runtime-types";

export interface SuccessionEventData {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}
