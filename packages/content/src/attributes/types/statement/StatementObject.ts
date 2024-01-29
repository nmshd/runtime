import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/transport";
import nameOf from "easy-tsnameof";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../../attributes/hints";
import { AbstractIdentityDescriptor, AbstractIdentityDescriptorJSON, IAbstractIdentityDescriptor } from "./AbstractIdentityDescriptor";

export interface StatementObjectJSON extends AbstractIdentityDescriptorJSON {
    "@type": "StatementObject";
    address: string;
}

export interface IStatementObject extends IAbstractIdentityDescriptor {
    address: ICoreAddress;
}

@type("StatementObject")
export class StatementObject extends AbstractIdentityDescriptor implements IStatementObject {
    public static override readonly propertyNames: any = nameOf<StatementObject, never>();

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
                [this.propertyNames.address.$path]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.address.$path]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                })
            }
        });
    }
}
