import { AxiosRequestConfig } from "axios";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTagCollection } from "./BackboneGetTagCollection";

export class TagClient extends RESTClientAuthenticate {
    private tagCollectionETag: string | undefined;

    public async getTagCollection(forceUpdate: true): Promise<ClientResult<BackboneGetTagCollection>>;
    public async getTagCollection(forceUpdate?: false): Promise<ClientResult<BackboneGetTagCollection> | undefined>;
    public async getTagCollection(forceUpdate?: boolean): Promise<ClientResult<BackboneGetTagCollection> | undefined> {
        const headers: AxiosRequestConfig["headers"] = {};
        if (!forceUpdate && this.tagCollectionETag) {
            headers["if-none-match"] = this.tagCollectionETag;
        }

        const result = await this.get<BackboneGetTagCollection>("/api/v1/Tags", undefined, {
            headers,
            validateStatus: (status) => status === 200 || status === 304
        });

        if (result.responseStatus === 304) {
            return undefined;
        }

        this.tagCollectionETag = result.etag;
        return result;
    }
}
