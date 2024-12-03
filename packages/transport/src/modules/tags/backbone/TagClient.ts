import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneAttributeTagCollection } from "./BackboneGetTag";

export class AttributeTagClient extends RESTClientAuthenticate {
    public async getBackboneAttributeTagCollection(): Promise<ClientResult<BackboneAttributeTagCollection>> {
        return await this.get<BackboneAttributeTagCollection>("/api/v1/Tags");
    }
}
