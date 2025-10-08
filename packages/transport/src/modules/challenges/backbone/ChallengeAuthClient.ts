import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";

export interface ChallengeClientGetChallengeResponse {
    id: string;
    createdBy: string;
    createdByDevice: string;
    expiresAt: string;
}

export interface ChallengeClientCreateChallengeResponse {
    id: string;
    createdBy: string;
    createdByDevice: string;
    expiresAt: string;
}

export class ChallengeAuthClient extends RESTClientAuthenticate {
    public async createChallenge(): Promise<ClientResult<ChallengeClientCreateChallengeResponse>> {
        return await this.post<ChallengeClientCreateChallengeResponse>("/api/v2/Challenges", {});
    }

    public async getChallenge(id: string): Promise<ClientResult<ChallengeClientGetChallengeResponse>> {
        return await this.get<ChallengeClientGetChallengeResponse>(`/api/v2/Challenges/${id}`);
    }
}
