import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneDefinedTags } from "./BackboneGetTag";

export class TagClient extends RESTClientAuthenticate {
    public async getTags(): Promise<ClientResult<BackboneDefinedTags>> {
        return await this.get<BackboneDefinedTags>("/api/v1/Tags");
    }
}
