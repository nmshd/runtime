import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "./deletionInfos";

export interface ForwardedSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    sharedAt: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IForwardedSharingInfo extends IAbstractAttributeSharingInfo {
    sharedAt: ICoreDate;
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

export class ForwardedSharingInfo extends AbstractAttributeSharingInfo implements IForwardedSharingInfo {
    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: EmittedAttributeDeletionInfo;

    public static from(value: IForwardedSharingInfo | ForwardedSharingInfoJSON): ForwardedSharingInfo {
        return super.fromAny(value) as ForwardedSharingInfo;
    }
}
