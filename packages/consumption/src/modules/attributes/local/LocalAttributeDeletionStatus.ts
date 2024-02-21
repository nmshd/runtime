import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreDate } from "@nmshd/transport";

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
    public toBeDeletedAt?: ICoreDate;

    @serialize()
    @validate({ nullable: true })
    public toBeDeletedByPeerAt?: ICoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletedByPeer?: ICoreDate;

    public static from(value: ILocalAttributeDeletionStatus | LocalAttributeDeletionStatusJSON): LocalAttributeDeletionStatus {
        return super.fromAny(value) as LocalAttributeDeletionStatus;
    }
}
