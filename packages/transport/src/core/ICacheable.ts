import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable } from "./CoreSynchronizable";

export interface ICacheable {
    cache?: any;
    setCache(cache: any): void;
}

export function isCacheable(object: unknown): object is ICacheable {
    if (!(object instanceof CoreSynchronizable)) {
        return false;
    }

    if (typeof object !== "object") {
        return false;
    }

    const hasCacheProperty = object.toJSON().hasOwnProperty(nameof<ICacheable>((o) => o.cache));
    const hasSetCacheMethod = typeof (object as any).setCache === "function";

    return hasCacheProperty && hasSetCacheMethod;
}
