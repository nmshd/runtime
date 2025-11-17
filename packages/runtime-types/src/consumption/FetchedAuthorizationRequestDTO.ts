import { VerifiableCredentialDTO } from "./VerifiableCredentialDTO";

export interface FetchedAuthorizationRequestDTO {
    authorizationRequest: Record<string, any>;
    usedCredentials: VerifiableCredentialDTO[];
}
