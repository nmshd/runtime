import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeSharingDetails, AbstractAttributeSharingDetailsJSON, IAbstractAttributeSharingDetails } from "./AbstractAttributeSharingDetails";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "./deletionInfos";

export interface ForwardedSharingDetailsJSON extends AbstractAttributeSharingDetailsJSON {
    sharedAt: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IForwardedSharingDetails extends IAbstractAttributeSharingDetails {
    sharedAt: ICoreDate;
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

@type("ForwardedSharingDetails")
export class ForwardedSharingDetails extends AbstractAttributeSharingDetails implements IForwardedSharingDetails {
    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: EmittedAttributeDeletionInfo;

    public static from(value: IForwardedSharingDetails | ForwardedSharingDetailsJSON): ForwardedSharingDetails {
        return super.fromAny(value) as ForwardedSharingDetails;
    }
}
