import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTokensRequest, BackboneGetTokensResponse } from "./BackboneGetTokens";
import { BackbonePostTokensRequest, BackbonePostTokensResponse, BackboneUpdateTokenContentRequest, BackboneUpdateTokenContentResponse } from "./BackbonePostTokens";

export class TokenClient extends RESTClientAuthenticate {
    public async createToken(token: BackbonePostTokensRequest): Promise<ClientResult<BackbonePostTokensResponse>> {
        return await this.post<BackbonePostTokensResponse>("/api/v2/Tokens", token);
    }

    public async updateTokenContent(request: BackboneUpdateTokenContentRequest): Promise<ClientResult<BackboneUpdateTokenContentResponse>> {
        return await this.post<BackboneUpdateTokenContentResponse>(`/api/v2/Tokens/${request.id}/UpdateContent`, request);
    }

    public async getTokens(request: BackboneGetTokensRequest): Promise<ClientResult<Paginator<BackboneGetTokensResponse>>> {
        return await this.getPaged<BackboneGetTokensResponse>("/api/v2/Tokens", request);
    }

    public async getToken(id: string, password?: string): Promise<ClientResult<BackboneGetTokensResponse>> {
        const request = password ? { password } : undefined;
        return await this.get<BackboneGetTokensResponse>(`/api/v2/Tokens/${id}`, request);
    }

    public async deleteToken(id: string): Promise<ClientResult<void>> {
        return await this.delete<void>(`/api/v2/Tokens/${id}`);
    }
}
