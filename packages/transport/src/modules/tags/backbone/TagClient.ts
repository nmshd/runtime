import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTagCollection } from "./BackboneGetTagCollection";

export class TagClient extends RESTClientAuthenticate {
    public async getTagCollection(): Promise<ClientResult<BackboneGetTagCollection | undefined>> {
        return await this.get<BackboneGetTagCollection>("/api/v1/Tags");
    }
}
