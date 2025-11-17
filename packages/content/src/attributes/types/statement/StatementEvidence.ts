import { serialize, type, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../hints/index.js";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

/**
 * Supported Evidence
 */
export enum Evidence {
    OwnFact = "ownFact",
    DigitalPublicIDCard = "digitalPublicIDCard",
    DigitalPublicDocument = "digitalPublicDocument",
    DigitalDocument = "digitalDocument",
    SightCheckOfPublicIDCard = "sightCheckOfPublicIDCard",
    SightCheckOfPublicDocument = "sightCheckOfPublicDocument",
    SightCheckOfDocument = "sightCheckOfDocument",
    MediaOfPublicIDCard = "mediaOfPublicIDCard",
    MediaOfPublicDocument = "mediaOfPublicDocument",
    MediaOfDocument = "mediaOfDocument"
}

export interface StatementEvidenceJSON extends AbstractStringJSON {
    "@type": "StatementEvidence";
}

export interface IStatementEvidence extends IAbstractString {}

@type("StatementEvidence")
export class StatementEvidence extends AbstractString {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(Evidence).includes(v) ? `must be one of: ${Object.values(Evidence)}` : undefined)
    })
    public override value: Evidence;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            values: Object.values(Evidence).map((value) => ValueHintsValue.from({ key: value, displayName: `i18n://attributes.values.StatementEvidence.${value}` }))
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.ButtonLike
        });
    }

    public static from(value: IStatementEvidence | Omit<StatementEvidenceJSON, "@type"> | string): StatementEvidence {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementEvidenceJSON {
        return super.toJSON(verbose, serializeAsString) as StatementEvidenceJSON;
    }
}
