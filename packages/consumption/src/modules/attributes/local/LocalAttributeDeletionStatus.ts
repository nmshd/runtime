import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate } from "@nmshd/transport";

// TODO: check all places that need to be adjusted adding deletionStatus to LocalAttribute
export interface LocalAttributeDeletionStatusJSON {
    toBeDeletedAt?: string;
    toBeDeletedByPeerAt?: string;
    deletedByPeer?: string;
}

export interface ILocalAttributeDeletionStatus {
    toBeDeletedAt?: ICoreDate;
    toBeDeletedByPeerAt?: ICoreDate;
    deletedByPeer?: ICoreDate;
}

export class LocalAttributeDeletionStatus extends CoreSerializable implements ILocalAttributeDeletionStatus {
    @serialize()
    @validate({ nullable: true })
    public toBeDeletedAt?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public toBeDeletedByPeerAt?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletedByPeer?: CoreDate;

    public static from(value: ILocalAttributeDeletionStatus | LocalAttributeDeletionStatusJSON): LocalAttributeDeletionStatus {
        return super.fromAny(value) as LocalAttributeDeletionStatus;
    }
}
