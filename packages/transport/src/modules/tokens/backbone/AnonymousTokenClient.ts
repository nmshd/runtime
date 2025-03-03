import { RESTClient } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneGetTokensResponse } from "./BackboneGetTokens";

export class AnonymousTokenClient extends RESTClient {
    public async getToken(id: string, password?: string): Promise<ClientResult<BackboneGetTokensResponse>> {
        const request = password ? { password } : undefined;
        return await this.get<BackboneGetTokensResponse>(`/api/v1/Tokens/${id}`, request);
    }
}
