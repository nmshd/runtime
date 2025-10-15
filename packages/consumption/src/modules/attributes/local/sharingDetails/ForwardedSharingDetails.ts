import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "../deletionInfos";

export interface ForwardedSharingDetailsJSON {
    "@type": "ForwardedSharingDetails";
    attributeId: string;
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IForwardedSharingDetails extends ICoreSynchronizable {
    attributeId: ICoreId;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

@type("ForwardedSharingDetails")
export class ForwardedSharingDetails extends CoreSynchronizable implements IForwardedSharingDetails {
    @validate()
    @serialize()
    public attributeId: CoreId;

    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: EmittedAttributeDeletionInfo;

    public static from(value: IForwardedSharingDetails | ForwardedSharingDetailsJSON): ForwardedSharingDetails {
        return super.fromAny(value) as ForwardedSharingDetails;
    }
}
