import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { ContentJSON } from "../ContentJSON";
import { AttributeProof, AttributeProofJSON, IAttributeProof } from "./AttributeProof";

export interface AbstractAttributeJSON extends ContentJSON {
    owner: string;
    proof?: AttributeProofJSON;
    validFrom?: string;
    validTo?: string;
}

export interface IAbstractAttribute extends ISerializable {
    owner: ICoreAddress;
    proof?: IAttributeProof;
    validFrom?: ICoreDate;
    validTo?: ICoreDate;
}

export abstract class AbstractAttribute extends Serializable implements IAbstractAttribute {
    @validate()
    @serialize()
    public owner: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public proof?: AttributeProof;

    @serialize()
    @validate({ nullable: true })
    public validFrom?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo?: CoreDate;
}
