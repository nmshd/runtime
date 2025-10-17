import { ClientResult } from "../../../core/backbone/ClientResult";
import { Paginator } from "../../../core/backbone/Paginator";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetMessagesRequest, BackboneGetMessagesResponse } from "./BackboneGetMessages";
import { BackbonePostMessagesRequest, BackbonePostMessagesResponse } from "./BackbonePostMessages";

export class MessageClient extends RESTClientAuthenticate {
    public async getMessages(request?: BackboneGetMessagesRequest): Promise<ClientResult<Paginator<BackboneGetMessagesResponse>>> {
        return await this.getPaged<BackboneGetMessagesResponse>("/api/v2/Messages", request);
    }

    public async createMessage(input: BackbonePostMessagesRequest): Promise<ClientResult<BackbonePostMessagesResponse>> {
        return await this.post<BackbonePostMessagesResponse>("/api/v2/Messages", input);
    }

    public async getMessage(id: string): Promise<ClientResult<BackboneGetMessagesResponse>> {
        return await this.get<BackboneGetMessagesResponse>(`/api/v2/Messages/${id}`);
    }

    public async deleteMessage(id: string): Promise<ClientResult<void>> {
        return await this.delete<void>(`/api/v2/Messages/${id}`);
    }

    public async setRead(id: string): Promise<ClientResult<void>> {
        return await this.put<void>(`/api/v2/Messages/${id}/setReadFlag`, undefined);
    }
}
