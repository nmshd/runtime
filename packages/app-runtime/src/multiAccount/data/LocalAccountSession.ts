import { ConsumptionController } from "@nmshd/consumption";
import { ConsumptionServices, DataViewExpander, IdentityDVO, TransportServices } from "@nmshd/runtime";
import { AccountController } from "@nmshd/transport";
import { LocalAccountDTO } from "./LocalAccountDTO.js";

export interface LocalAccountSession {
    address: string;
    account: LocalAccountDTO;
    transportServices: TransportServices;
    consumptionServices: ConsumptionServices;
    expander: DataViewExpander;
    accountController: AccountController;
    consumptionController: ConsumptionController;
    selectedRelationship?: IdentityDVO;
    expiresAt?: string;
    devicePushIdentifier?: string;
}
