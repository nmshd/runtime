import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "./deletionInfos";

export interface AttributeForwardingDetailsJSON {
    "@type": "ForwardingDetails";
    attributeId: string;
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IAttributeForwardingDetails extends ICoreSynchronizable {
    attributeId: ICoreId;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

@type("AttributeForwardingDetails")
export class AttributeForwardingDetails extends CoreSynchronizable implements IAttributeForwardingDetails {
    public override technicalProperties = [
        nameof<AttributeForwardingDetails>((f) => f.attributeId),
        nameof<AttributeForwardingDetails>((f) => f.peer),
        nameof<AttributeForwardingDetails>((f) => f.sourceReference),
        nameof<AttributeForwardingDetails>((f) => f.sharedAt),
        nameof<AttributeForwardingDetails>((f) => f.deletionInfo)
    ];

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

    public static from(value: IAttributeForwardingDetails | AttributeForwardingDetailsJSON): AttributeForwardingDetails {
        return super.fromAny(value) as AttributeForwardingDetails;
    }
}
