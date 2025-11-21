import { VerifiableCredentialDTO } from "./VerifiableCredentialDTO";

export interface ResolvedAuthorizationRequestDTO {
    authorizationRequest: Record<string, any>;
    usedCredentials: VerifiableCredentialDTO[];
}
