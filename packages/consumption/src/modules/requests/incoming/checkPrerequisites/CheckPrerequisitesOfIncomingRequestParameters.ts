import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";

export interface ICheckPrerequisitesOfIncomingRequestParameters extends ISerializable {
    requestId: ICoreId;
}

@type("CheckPrerequisitesOfIncomingRequestParameters")
export class CheckPrerequisitesOfIncomingRequestParameters extends Serializable implements ICheckPrerequisitesOfIncomingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId;

    public static from(value: ICheckPrerequisitesOfIncomingRequestParameters): CheckPrerequisitesOfIncomingRequestParameters {
        return this.fromAny(value);
    }
}
