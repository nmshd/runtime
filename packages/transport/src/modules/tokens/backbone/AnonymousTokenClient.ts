import { RESTClient } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneGetTokensResponse } from "./BackboneGetTokens";
import { BackbonePostTokensRequest, BackbonePostTokensResponse } from "./BackbonePostTokens";

export class AnonymousTokenClient extends RESTClient {
    public async createToken(request: Omit<BackbonePostTokensRequest, "content">): Promise<ClientResult<BackbonePostTokensResponse>> {
        return await this.post<BackbonePostTokensResponse>("/api/v2/Tokens", request);
    }

    public async getToken(id: string, password?: string): Promise<ClientResult<BackboneGetTokensResponse>> {
        const request = password ? { password } : undefined;
        return await this.get<BackboneGetTokensResponse>(`/api/v2/Tokens/${id}`, request);
    }
}
