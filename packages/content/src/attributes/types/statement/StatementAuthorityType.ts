import { serialize, type, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../hints/index.js";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

/**
 * Supported Authority
 */
export enum Authority {
    OwnAuthority = "ownAuthority",
    TrustedAuthority = "trustedAuthority",
    PublicAuthority = "publicAuthority",
    RelayedOwnAuthority = "relayedOwnAuthority",
    RelayedTrustedAuthority = "relayedTrustedAuthority",
    RelayedPublicAuthority = "relayedPublicAuthority"
}

export interface StatementAuthorityTypeJSON extends AbstractStringJSON {
    "@type": "StatementAuthorityType";
}

export interface IStatementAuthorityType extends IAbstractString {}

@type("StatementAuthorityType")
export class StatementAuthorityType extends AbstractString {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(Authority).includes(v) ? `must be one of: ${Object.values(Authority)}` : undefined)
    })
    public override value: Authority;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            values: Object.values(Authority).map((value) =>
                ValueHintsValue.from({
                    key: value,
                    displayName: `i18n://attributes.values.StatementAuthority.${value}`
                })
            )
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.ButtonLike
        });
    }

    public static from(value: IStatementAuthorityType | Omit<StatementAuthorityTypeJSON, "@type"> | string): StatementAuthorityType {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementAuthorityTypeJSON {
        return super.toJSON(verbose, serializeAsString) as StatementAuthorityTypeJSON;
    }
}
