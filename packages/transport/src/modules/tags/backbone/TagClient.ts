import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTag } from "./BackboneGetTag";

export class TagClient extends RESTClientAuthenticate {
    public async getTags(): Promise<ClientResult<BackboneGetTag>> {
        return await this.get<BackboneGetTag>("/api/v1/Tags");
    }
}
