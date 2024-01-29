import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTokensRequest, BackboneGetTokensResponse } from "./BackboneGetTokens";
import { BackbonePostTokensRequest, BackbonePostTokensResponse } from "./BackbonePostTokens";

export class TokenClient extends RESTClientAuthenticate {
    public async createToken(token: BackbonePostTokensRequest): Promise<ClientResult<BackbonePostTokensResponse>> {
        return await this.post<BackbonePostTokensResponse>("/api/v1/Tokens", token);
    }

    public async getTokens(request: BackboneGetTokensRequest): Promise<ClientResult<Paginator<BackboneGetTokensResponse>>> {
        return await this.getPaged<BackboneGetTokensResponse>("/api/v1/Tokens", request);
    }

    public async getToken(id: string): Promise<ClientResult<BackboneGetTokensResponse>> {
        return await this.get<BackboneGetTokensResponse>(`/api/v1/Tokens/${id}`);
    }

    public async deleteToken(id: string): Promise<ClientResult<void>> {
        return await this.delete<void>(`/api/v1/Tokens/${id}`);
    }
}
