import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClient } from "../../../core/index.js";
import { GetBackboneVersionResponse } from "./GetBackboneVersionResponse.js";

export class VersionClient extends RESTClient {
    public async getBackboneVersion(): Promise<ClientResult<GetBackboneVersionResponse>> {
        return await this.get<GetBackboneVersionResponse>("/api/v2/Version");
    }
}
