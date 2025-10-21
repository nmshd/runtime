import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "../deletionInfos";

export interface ForwardingDetailsJSON {
    "@type": "ForwardingDetails";
    attributeId: string;
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IForwardingDetails extends ICoreSynchronizable {
    attributeId: ICoreId;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

@type("ForwardingDetails")
export class ForwardingDetails extends CoreSynchronizable implements IForwardingDetails {
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

    public static from(value: IForwardingDetails | ForwardingDetailsJSON): ForwardingDetails {
        return super.fromAny(value) as ForwardingDetails;
    }
}
