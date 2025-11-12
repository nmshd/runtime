import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClient } from "../../../core/index.js";
import { BackboneGetTokensResponse } from "./BackboneGetTokens.js";
import { BackbonePostTokensRequest, BackbonePostTokensResponse } from "./BackbonePostTokens.js";

export class AnonymousTokenClient extends RESTClient {
    public async createToken(request: Omit<BackbonePostTokensRequest, "content">): Promise<ClientResult<BackbonePostTokensResponse>> {
        return await this.post<BackbonePostTokensResponse>("/api/v2/Tokens", request);
    }

    public async getToken(id: string, password?: string): Promise<ClientResult<BackboneGetTokensResponse>> {
        const request = password ? { password } : undefined;
        return await this.get<BackboneGetTokensResponse>(`/api/v2/Tokens/${id}`, request);
    }
}
