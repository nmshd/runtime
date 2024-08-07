import { RESTClient } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneVersion } from "./BackboneVersion";

export class VersionClient extends RESTClient {
    public async getBackboneVersion(): Promise<ClientResult<BackboneVersion>> {
        return await this.get<BackboneVersion>("/api/v1/Version");
    }
}
