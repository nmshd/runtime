import { AxiosRequestConfig } from "axios";
import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate.js";
import { BackboneGetTagCollection } from "./BackboneGetTagCollection.js";

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
