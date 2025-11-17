import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClient } from "../../../core/index.js";
import { ChallengeClientCreateChallengeResponse } from "./ChallengeAuthClient.js";

export class ChallengeClient extends RESTClient {
    public async createChallenge(): Promise<ClientResult<ChallengeClientCreateChallengeResponse>> {
        return await this.post<ChallengeClientCreateChallengeResponse>("/api/v2/Challenges", {});
    }
}
