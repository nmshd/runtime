import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints/index.js";
import { DigitalIdentityDescriptor } from "./DigitalIdentityDescriptor.js";
import { StatementAuthorityType } from "./StatementAuthorityType.js";
import { StatementEvidence } from "./StatementEvidence.js";

export interface StatementIssuerConditionsJSON extends AbstractComplexValueJSON {
    "@type": "StatementIssuerConditions";
    validFrom: string;
    validTo: string;
    evidence: string;
    authorityType: string;
    relayedParty?: string;
}

export interface IStatementIssuerConditions extends IAbstractComplexValue {
    validFrom: ICoreDate;
    validTo: ICoreDate;
    evidence: StatementEvidence;
    authorityType: StatementAuthorityType;
    relayedParty?: DigitalIdentityDescriptor;
}

@type("StatementIssuerConditions")
export class StatementIssuerConditions extends AbstractComplexValue implements IStatementIssuerConditions {
    @serialize()
    @validate()
    public validFrom: CoreDate;

    @serialize()
    @validate()
    public validTo: CoreDate;

    @serialize()
    @validate()
    public evidence: StatementEvidence;

    @serialize()
    @validate()
    public authorityType: StatementAuthorityType;

    @serialize()
    @validate({ nullable: true })
    public relayedParty?: DigitalIdentityDescriptor;

    public static from(value: IStatementIssuerConditions | Omit<StatementIssuerConditionsJSON, "@type"> | string): StatementIssuerConditions {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementIssuerConditionsJSON {
        return super.toJSON(verbose, serializeAsString) as StatementIssuerConditionsJSON;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<StatementIssuerConditions>((s) => s.validFrom)]: ValueHints.from({}),
                [nameof<StatementIssuerConditions>((s) => s.validTo)]: ValueHints.from({}),
                [nameof<StatementIssuerConditions>((s) => s.evidence)]: StatementEvidence.valueHints,
                [nameof<StatementIssuerConditions>((s) => s.authorityType)]: StatementAuthorityType.valueHints,
                [nameof<StatementIssuerConditions>((s) => s.relayedParty)]: DigitalIdentityDescriptor.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<StatementIssuerConditions>((s) => s.validFrom)]: RenderHints.from({
                    editType: RenderHintsEditType.Secret,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [nameof<StatementIssuerConditions>((s) => s.validTo)]: RenderHints.from({
                    editType: RenderHintsEditType.Secret,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [nameof<StatementIssuerConditions>((s) => s.evidence)]: StatementEvidence.renderHints,
                [nameof<StatementIssuerConditions>((s) => s.authorityType)]: StatementAuthorityType.renderHints,
                [nameof<StatementIssuerConditions>((s) => s.relayedParty)]: DigitalIdentityDescriptor.renderHints
            }
        });
    }
}
