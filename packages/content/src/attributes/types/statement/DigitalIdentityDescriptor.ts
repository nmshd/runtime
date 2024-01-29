import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/transport";
import nameOf from "easy-tsnameof";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../../attributes/hints";

import { AbstractIdentityDescriptor, AbstractIdentityDescriptorJSON, IAbstractIdentityDescriptor } from "./AbstractIdentityDescriptor";

export interface DigitalIdentityDescriptorJSON extends AbstractIdentityDescriptorJSON {
    "@type": "DigitalIdentityDescriptor";
    address: string;
}

export interface IDigitalIdentityDescriptor extends IAbstractIdentityDescriptor {
    address: ICoreAddress;
}

@type("DigitalIdentityDescriptor")
export class DigitalIdentityDescriptor extends AbstractIdentityDescriptor implements IDigitalIdentityDescriptor {
    public static override readonly propertyNames: any = nameOf<DigitalIdentityDescriptor, never>();

    @serialize({ type: CoreAddress })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public address: CoreAddress;

    public static from(value: IDigitalIdentityDescriptor | Omit<DigitalIdentityDescriptorJSON, "@type"> | string): DigitalIdentityDescriptor {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DigitalIdentityDescriptorJSON {
        return super.toJSON(verbose, serializeAsString) as DigitalIdentityDescriptorJSON;
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
