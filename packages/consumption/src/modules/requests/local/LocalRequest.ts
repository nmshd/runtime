import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRequest, Request } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";

import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { LocalRequestStatus } from "./LocalRequestStatus";
import { ILocalRequestStatusLogEntry, LocalRequestStatusLogEntry } from "./LocalRequestStatusLogEntry";
import { ILocalResponse, LocalResponse } from "./LocalResponse";

export interface ILocalRequestSource extends ISerializable {
    type: "Message" | "RelationshipTemplate";
    reference: ICoreId;
}

@type("LocalRequestSource")
export class LocalRequestSource extends Serializable implements ILocalRequestSource {
    @serialize()
    @validate({ allowedValues: ["Message", "RelationshipTemplate"] })
    public type: "Message" | "RelationshipTemplate";

    @serialize()
    @validate()
    public reference: CoreId;

    public static from(value: ILocalRequestSource): LocalRequestSource {
        return this.fromAny(value);
    }
}

export interface ILocalRequest extends ICoreSynchronizable {
    isOwn: boolean;
    peer: ICoreAddress;
    createdAt: ICoreDate;
    content: IRequest;
    source?: ILocalRequestSource;
    response?: ILocalResponse;
    status: LocalRequestStatus;
    statusLog: ILocalRequestStatusLogEntry[];
    wasAutomaticallyDecided?: true;
}

@type("LocalRequest")
export class LocalRequest extends CoreSynchronizable implements ILocalRequest {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<LocalRequest>((r) => r.isOwn),
        nameof<LocalRequest>((r) => r.peer),
        nameof<LocalRequest>((r) => r.createdAt),
        nameof<LocalRequest>((r) => r.source),
        nameof<LocalRequest>((r) => r.status),
        nameof<LocalRequest>((r) => r.statusLog),
        nameof<LocalRequest>((r) => r.wasAutomaticallyDecided)
    ];

    public override readonly userdataProperties = [nameof<LocalRequest>((r) => r.content), nameof<LocalRequest>((r) => r.response)];

    @serialize()
    @validate()
    public isOwn: boolean;

    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate()
    public content: Request;

    @serialize()
    @validate({ nullable: true })
    public source?: LocalRequestSource;

    @serialize()
    @validate({ nullable: true })
    public response?: LocalResponse;

    @serialize()
    @validate()
    public status: LocalRequestStatus;

    @serialize({ type: LocalRequestStatusLogEntry })
    @validate()
    public statusLog: LocalRequestStatusLogEntry[];

    @serialize()
    @validate({ nullable: true })
    public wasAutomaticallyDecided?: true;

    public changeStatus(newStatus: LocalRequestStatus): void {
        if (this.status === newStatus) throw new ConsumptionError("cannot change status to the same status");

        const logEntry = LocalRequestStatusLogEntry.from({
            createdAt: CoreDate.utc(),
            oldStatus: this.status,
            newStatus
        });

        this.statusLog.push(logEntry);

        this.status = newStatus;
    }

    public sent(source: LocalRequestSource): void {
        if (this.status !== LocalRequestStatus.Draft) {
            throw new ConsumptionError("Local Request has to be in status 'Draft'.");
        }

        this.source = source;
        this.changeStatus(LocalRequestStatus.Open);
    }

    public static from(value: ILocalRequest): LocalRequest {
        return this.fromAny(value);
    }

    public isExpired(comparisonDate: CoreDate = CoreDate.utc()): boolean {
        if (!this.content.expiresAt) return false;

        return comparisonDate.isAfter(this.content.expiresAt);
    }

    public updateStatusBasedOnExpiration(comparisonDate: CoreDate = CoreDate.utc()): boolean {
        if (this.status === LocalRequestStatus.Completed || this.status === LocalRequestStatus.Expired) return false;

        if (this.isExpired(comparisonDate)) {
            this.changeStatus(LocalRequestStatus.Expired);
            return true;
        }

        return false;
    }

    public updateExpirationDateBasedOnTemplateExpiration(templateExpiresAt: CoreDate): boolean {
        if (this.source?.type !== "RelationshipTemplate") return false;

        if (this.status === LocalRequestStatus.Completed || this.status === LocalRequestStatus.Expired) return false;

        if (!this.isExpired()) {
            this.content.expiresAt = CoreDate.min(templateExpiresAt, this.content.expiresAt);
            return true;
        }

        return false;
    }
}
