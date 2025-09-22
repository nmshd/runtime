import { AxiosRequestConfig } from "axios";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTagCollection } from "./BackboneGetTagCollection";

export class TagClient extends RESTClientAuthenticate {
    public async getTagCollection(etag?: string): Promise<ClientResult<BackboneGetTagCollection> | undefined> {
        const headers: AxiosRequestConfig["headers"] = {};
        if (etag) {
            headers["if-none-match"] = etag;
        }

        const result = await this.get<BackboneGetTagCollection>("/api/v2/Tags", undefined, {
            headers,
            validateStatus: (status) => status === 200 || status === 304
        });

        if (result.responseStatus === 304) {
            return undefined;
        }

        return result;
    }
}
