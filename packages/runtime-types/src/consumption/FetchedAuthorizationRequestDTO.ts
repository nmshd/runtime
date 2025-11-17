import { VerifiableCredentialDTO } from "./VerifiableCredentialDTO";

export interface FetchedAuthorizationRequestDTO {
    jsonRepresentation: string;
    usedCredentials: VerifiableCredentialDTO[];
}
