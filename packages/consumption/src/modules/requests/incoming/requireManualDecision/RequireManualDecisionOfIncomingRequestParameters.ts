import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";

export interface IRequireManualDecisionOfIncomingRequestParameters extends ISerializable {
    requestId: ICoreId;
}

export class RequireManualDecisionOfIncomingRequestParameters extends Serializable implements IRequireManualDecisionOfIncomingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId;

    public static from(value: IRequireManualDecisionOfIncomingRequestParameters): RequireManualDecisionOfIncomingRequestParameters {
        return this.fromAny(value);
    }
}
