import { Serializable, type } from "@js-soft/ts-serval"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"
import { ConsumptionError } from "../../../../consumption/ConsumptionError"

export interface AcceptVerifiableAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON { }

@type("AcceptVerifiableAttributeRequestItemParameters")
export class AcceptVerifiableAttributeRequestItemParameters extends Serializable {
	public static from(
		value: AcceptVerifiableAttributeRequestItemParametersJSON
	): AcceptVerifiableAttributeRequestItemParameters {
		return this.fromAny(value)
	}

	protected static override postFrom<T extends Serializable>(value: T): T {
		if (!(value instanceof AcceptVerifiableAttributeRequestItemParameters)) {
			throw new ConsumptionError("this should never happen")
		}

		return value
	}
}
