import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractFileReference } from "../strings";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryFileReferenceJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryFileReference";
}

export interface IProprietaryFileReference extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryFileReference")
export class ProprietaryFileReference extends AbstractFileReference {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryFileReference | Omit<ProprietaryFileReferenceJSON, "@type">): ProprietaryFileReference {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryFileReferenceJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryFileReferenceJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
