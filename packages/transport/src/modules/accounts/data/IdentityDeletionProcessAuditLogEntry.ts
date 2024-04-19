import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreSerializable, ICoreSerializable } from "../../../core";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface IdentityDeletionProcessAuditLogEntryJson {
    id: string;
    processId: string;
    createdAt: string;
    message: string;
    identityAddressHash: string;
    deviceIdHash?: string;
    oldStatus?: IdentityDeletionProcessStatus;
    newStatus: IdentityDeletionProcessStatus;
}

export interface IIdentityDeletionProcessAuditLogEntry extends ICoreSerializable {
    id: CoreId;
    processId: CoreId;
    createdAt: CoreDate;
    message: string;
    identityAddressHash: string;
    deviceIdHash?: string;
    oldStatus?: IdentityDeletionProcessStatus;
    newStatus: IdentityDeletionProcessStatus;
}

@type("IdentityDeletionProcessAuditLogEntry")
export class IdentityDeletionProcessAuditLogEntry extends CoreSerializable implements IIdentityDeletionProcessAuditLogEntry {
    @validate()
    @serialize()
    public id: CoreId;
    @validate()
    @serialize()
    public processId: CoreId;
    @validate()
    @serialize()
    public createdAt: CoreDate;
    @validate()
    @serialize()
    public message: string;
    @validate()
    @serialize()
    public identityAddressHash: string;
    @validate()
    @serialize()
    public deviceIdHash?: string | undefined;
    @validate()
    @serialize()
    public oldStatus?: IdentityDeletionProcessStatus | undefined;
    @validate()
    @serialize()
    public newStatus: IdentityDeletionProcessStatus;

    public static from(value: IIdentityDeletionProcessAuditLogEntry): IdentityDeletionProcessAuditLogEntry {
        return this.fromAny(value);
    }
}
