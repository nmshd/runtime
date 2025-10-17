import { RESTClient } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { ChallengeClientCreateChallengeResponse } from "./ChallengeAuthClient";

export class ChallengeClient extends RESTClient {
    public async createChallenge(): Promise<ClientResult<ChallengeClientCreateChallengeResponse>> {
        return await this.post<ChallengeClientCreateChallengeResponse>("/api/v2/Challenges", {});
    }
}
