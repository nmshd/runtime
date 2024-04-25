import { IdentityDeletionProcessDTO } from "./IdentityDeletionProcessDTO";

export interface IdentityDTO {
    address: string;
    publicKey: string;
    realm: string;
    deletionInfo?: IdentityDeletionProcessDTO;
}
