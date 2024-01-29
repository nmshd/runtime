import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/transport";
import nameOf from "easy-tsnameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";
import { DigitalIdentityDescriptor } from "./DigitalIdentityDescriptor";
import { StatementAuthorityType } from "./StatementAuthorityType";
import { StatementEvidence } from "./StatementEvidence";

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
    public static readonly propertyNames: any = nameOf<StatementIssuerConditions, never>();

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
                [this.propertyNames.validFrom.$path]: ValueHints.from({}),
                [this.propertyNames.validTo.$path]: ValueHints.from({}),
                [this.propertyNames.evidence.$path]: StatementEvidence.valueHints,
                [this.propertyNames.authorityType.$path]: StatementAuthorityType.valueHints,
                [this.propertyNames.relayedParty.$path]: DigitalIdentityDescriptor.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.validFrom.$path]: RenderHints.from({
                    editType: RenderHintsEditType.Secret,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [this.propertyNames.validTo.$path]: RenderHints.from({
                    editType: RenderHintsEditType.Secret,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [this.propertyNames.evidence.$path]: StatementEvidence.renderHints,
                [this.propertyNames.authorityType.$path]: StatementAuthorityType.renderHints,
                [this.propertyNames.relayedParty.$path]: DigitalIdentityDescriptor.renderHints
            }
        });
    }
}
