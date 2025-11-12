import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractIdentityDescriptor, AbstractIdentityDescriptorJSON, IAbstractIdentityDescriptor } from "./AbstractIdentityDescriptor.js";

export interface StatementObjectJSON extends AbstractIdentityDescriptorJSON {
    "@type": "StatementObject";
    address: string;
}

export interface IStatementObject extends IAbstractIdentityDescriptor {
    address: ICoreAddress;
}

@type("StatementObject")
export class StatementObject extends AbstractIdentityDescriptor implements IStatementObject {
    @serialize({ type: CoreAddress })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public address: CoreAddress;

    public static from(value: IStatementObject | Omit<StatementObjectJSON, "@type"> | string): StatementObject {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementObjectJSON {
        return super.toJSON(verbose, serializeAsString) as StatementObjectJSON;
    }

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            propertyHints: {
                [nameof<StatementObject>((d) => d.address)]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<StatementObject>((d) => d.address)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                })
            }
        });
    }
}
