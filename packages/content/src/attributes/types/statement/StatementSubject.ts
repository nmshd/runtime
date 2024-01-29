import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/transport";
import nameOf from "easy-tsnameof";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../../attributes/hints";
import { AbstractIdentityDescriptor, AbstractIdentityDescriptorJSON, IAbstractIdentityDescriptor } from "./AbstractIdentityDescriptor";

export interface StatementSubjectJSON extends AbstractIdentityDescriptorJSON {
    "@type": "StatementSubject";
    address: string;
}

export interface IStatementSubject extends IAbstractIdentityDescriptor {
    address: ICoreAddress;
}

@type("StatementSubject")
export class StatementSubject extends AbstractIdentityDescriptor implements IStatementSubject {
    public static override readonly propertyNames: any = nameOf<StatementSubject, never>();

    @serialize({ type: CoreAddress })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public address: CoreAddress;

    public static from(value: IStatementSubject | Omit<StatementSubjectJSON, "@type">): StatementSubject {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementSubjectJSON {
        return super.toJSON(verbose, serializeAsString) as StatementSubjectJSON;
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
