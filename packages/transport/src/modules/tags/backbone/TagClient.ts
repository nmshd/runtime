import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneTagList } from "./BackboneGetTag";

export class TagClient extends RESTClientAuthenticate {
    public async getTags(): Promise<ClientResult<BackboneTagList>> {
        return await this.get<BackboneTagList>("/api/v1/Tags");
    }
}
