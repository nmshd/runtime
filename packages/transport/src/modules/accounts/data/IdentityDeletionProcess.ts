import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable } from "../../../core";
import { CachedIdentityDeletionProcess, CachedIdentityDeletionProcessJSON } from "./CachedIdentityDeletionProcess";

export interface IdentityDeletionProcessJSON {
    id: string;
    cache?: CachedIdentityDeletionProcessJSON;
    cachedAt?: string;
}

export interface IIdentityDeletionProcess {
    id: CoreId;
    cache?: CachedIdentityDeletionProcess;
    cachedAt?: CoreDate;
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSynchronizable implements IIdentityDeletionProcess {
    public override readonly technicalProperties = [nameof<IdentityDeletionProcess>((r) => r.id)];

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedIdentityDeletionProcess;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON): IdentityDeletionProcess {
        return this.fromAny(value);
    }

    public setCache(cache: CachedIdentityDeletionProcess): this {
        this.cache = cache;
        this.cachedAt = CoreDate.utc();
        return this;
    }
}
