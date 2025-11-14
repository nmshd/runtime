import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../../attributes/hints/index.js";

import { nameof } from "ts-simple-nameof";
import { AbstractIdentityDescriptor, AbstractIdentityDescriptorJSON, IAbstractIdentityDescriptor } from "./AbstractIdentityDescriptor.js";

export interface DigitalIdentityDescriptorJSON extends AbstractIdentityDescriptorJSON {
    "@type": "DigitalIdentityDescriptor";
    address: string;
}

export interface IDigitalIdentityDescriptor extends IAbstractIdentityDescriptor {
    address: ICoreAddress;
}

@type("DigitalIdentityDescriptor")
export class DigitalIdentityDescriptor extends AbstractIdentityDescriptor implements IDigitalIdentityDescriptor {
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
                [nameof<DigitalIdentityDescriptor>((d) => d.address)]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<DigitalIdentityDescriptor>((d) => d.address)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                })
            }
        });
    }
}
