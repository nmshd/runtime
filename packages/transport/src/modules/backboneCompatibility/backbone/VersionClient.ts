import { RESTClient } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { GetBackboneVersionResponse } from "./GetBackboneVersionResponse";

export class VersionClient extends RESTClient {
    public async getBackboneVersion(): Promise<ClientResult<GetBackboneVersionResponse>> {
        return await this.get<GetBackboneVersionResponse>("/api/v2/Version");
    }
}
