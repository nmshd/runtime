import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../../consumption/ConsumptionError";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

/**
 * Send a copy of an existing attribute to the peer.
 */
export interface AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON extends AcceptRequestItemParametersJSON {
    attributeId: string;
}

/**
 * Create a new Local Attribute. If you want to use the proposed Attribute, just pass it here.
 */
export interface AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON extends AcceptRequestItemParametersJSON {
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export type AcceptProposeAttributeRequestItemParametersJSON =
    | AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON
    | AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON;

@type("AcceptProposeAttributeRequestItemParameters")
export class AcceptProposeAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate({ nullable: true })
    public attributeId?: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate({ nullable: true })
    public attribute?: IdentityAttribute | RelationshipAttribute;

    public isWithExistingAttribute(): this is { attributeId: CoreId } {
        return typeof this.attributeId !== "undefined";
    }

    public isWithNewAttribute(): this is { attribute: IdentityAttribute | RelationshipAttribute } {
        return typeof this.attribute !== "undefined";
    }

    public static from(value: AcceptProposeAttributeRequestItemParametersJSON): AcceptProposeAttributeRequestItemParameters {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof AcceptProposeAttributeRequestItemParameters)) {
            throw new ConsumptionError("this should never happen");
        }

        if (value.attributeId && value.attribute) {
            throw new ValidationError(
                AcceptProposeAttributeRequestItemParameters.name,
                nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attribute),
                `You cannot specify both ${nameof<AcceptProposeAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} and ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
            );
        }

        if (!value.attributeId && !value.attribute) {
            throw new ValidationError(
                AcceptProposeAttributeRequestItemParameters.name,
                nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attribute),
                `You have to specify either ${nameof<AcceptProposeAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} or ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
            );
        }

        return value;
    }
}
