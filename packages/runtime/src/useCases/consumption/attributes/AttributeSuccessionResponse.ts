import { CoreId } from "@nmshd/transport";
import { LocalAttributeDTO } from "../../../types";

export interface AttributeSuccessionResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}

export interface AttributeSuccessionWithNotificationResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
    notificationId: CoreId;
}
