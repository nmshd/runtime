import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../../consumption/ConsumptionError";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON extends AcceptRequestItemParametersJSON {
    existingAttributeId: string;
}

export interface AcceptReadAttributeRequestItemParametersWithNewAttributeJSON extends AcceptRequestItemParametersJSON {
    newAttribute: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export type AcceptReadAttributeRequestItemParametersJSON =
    | AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
    | AcceptReadAttributeRequestItemParametersWithNewAttributeJSON;

@type("AcceptReadAttributeRequestItemParameters")
export class AcceptReadAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate({ nullable: true })
    public existingAttributeId?: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate({ nullable: true })
    public newAttribute?: IdentityAttribute | RelationshipAttribute;

    public isWithExistingAttribute(): this is { existingAttributeId: CoreId } {
        return !!this.existingAttributeId;
    }

    public isWithNewAttribute(): this is { newAttribute: IdentityAttribute | RelationshipAttribute } {
        return !!this.newAttribute;
    }

    public static from(value: AcceptReadAttributeRequestItemParametersJSON): AcceptReadAttributeRequestItemParameters {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof AcceptReadAttributeRequestItemParameters)) {
            throw new ConsumptionError("this should never happen");
        }

        if (value.existingAttributeId && value.newAttribute) {
            throw new ValidationError(
                AcceptReadAttributeRequestItemParameters.name,
                nameof<AcceptReadAttributeRequestItemParameters>((x) => x.newAttribute),
                `You cannot specify both ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.newAttribute
                )} and ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.existingAttributeId)}.`
            );
        }

        if (!value.existingAttributeId && !value.newAttribute) {
            throw new ValidationError(
                AcceptReadAttributeRequestItemParameters.name,
                nameof<AcceptReadAttributeRequestItemParameters>((x) => x.newAttribute),
                `You have to specify either ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.newAttribute
                )} or ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.existingAttributeId)}.`
            );
        }

        return value;
    }
}
