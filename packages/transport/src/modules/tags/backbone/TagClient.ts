import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackboneGetTagCollection } from "./BackboneGetTagCollection";

export class TagClient extends RESTClientAuthenticate {
    private tagCollectionETag: string | undefined;

    public async getTagCollection(forceUpdate?: true): Promise<ClientResult<BackboneGetTagCollection>>;
    public async getTagCollection(forceUpdate?: boolean): Promise<ClientResult<BackboneGetTagCollection> | undefined> {
        const result = await this.get<BackboneGetTagCollection>("/api/v1/Tags", undefined, {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "if-none-match": forceUpdate ? "" : this.tagCollectionETag
            }
        });
        if (result.responseStatus === 304) {
            return undefined;
        }
        this.tagCollectionETag = result.etag;
        return result;
    }
}
