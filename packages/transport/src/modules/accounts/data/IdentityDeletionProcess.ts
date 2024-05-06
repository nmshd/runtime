import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { CoreDate, CoreId, CoreSynchronizable } from "../../../core";
import { CachedIdentityDeletionProcess, CachedIdentityDeletionProcessJSON } from "./CachedIdentityDeletionProcess";

export interface IdentityDeletionProcessJSON {
    id: string;
    cache?: CachedIdentityDeletionProcessJSON;
    // TODO: Do we need the following fields?
    cachedAt?: string;
    metadata?: any;
    metadataModifiedAt?: string;
}

export interface IIdentityDeletionProcess {
    id: CoreId;
    cache?: CachedIdentityDeletionProcess;
    cachedAt?: CoreDate;
    metadata?: any;
    metadataModifiedAt?: CoreDate;
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSynchronizable implements IIdentityDeletionProcess {
    public override readonly metadataProperties = [nameof<IdentityDeletionProcess>((r) => r.metadata), nameof<IdentityDeletionProcess>((r) => r.metadataModifiedAt)];

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedIdentityDeletionProcess;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON): IdentityDeletionProcess {
        return this.fromAny(value);
    }
}
