import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetAttributeTagCollection } from "./BackboneGetAttributeTagCollection";

export class AttributeTagClient extends RESTClientAuthenticate {
    public async getAttributeTagCollection(): Promise<ClientResult<BackboneGetAttributeTagCollection>> {
        return await this.get<BackboneGetAttributeTagCollection>("/api/v1/Tags");
    }
}
