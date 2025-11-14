import { serialize, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../../attributes/AbstractComplexValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../../attributes/hints/index.js";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "../../IdentityAttribute.js";

export interface AbstractIdentityDescriptorJSON extends AbstractComplexValueJSON {
    attributes?: IdentityAttributeJSON[];
}

export interface IAbstractIdentityDescriptor extends IAbstractComplexValue {
    attributes?: IIdentityAttribute[];
}

export abstract class AbstractIdentityDescriptor extends AbstractComplexValue implements IAbstractIdentityDescriptor {
    // TODO: enable type
    // @serialize({ type: IdentityAttribute })
    @serialize()
    @validate({ nullable: true })
    public attributes?: IdentityAttribute[];

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<AbstractIdentityDescriptor>((a) => a.attributes)]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<AbstractIdentityDescriptor>((a) => a.attributes)]: RenderHints.from({
                    editType: RenderHintsEditType.Complex,
                    technicalType: RenderHintsTechnicalType.Object
                })
            }
        });
    }
}
