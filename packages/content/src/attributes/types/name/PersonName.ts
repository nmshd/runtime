import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { GivenName, IGivenName } from "./GivenName";
import { HonorificPrefix, IHonorificPrefix } from "./HonorificPrefix";
import { HonorificSuffix, IHonorificSuffix } from "./HonorificSuffix";
import { IMiddleName, MiddleName } from "./MiddleName";
import { ISurname, Surname } from "./Surname";

export interface PersonNameJSON extends AbstractComplexValueJSON {
    "@type": "PersonName";
    givenName: string;
    middleName?: string;
    surname: string;
    honorificSuffix?: string;
    honorificPrefix?: string;
}

export interface IPersonName extends IAbstractComplexValue {
    givenName: IGivenName | string;
    middleName?: IMiddleName | string;
    surname: ISurname | string;
    honorificSuffix?: IHonorificSuffix | string;
    honorificPrefix?: IHonorificPrefix | string;
}

@type("PersonName")
export class PersonName extends AbstractComplexValue implements IPersonName {
    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public givenName: GivenName;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public middleName?: MiddleName;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public surname: Surname;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public honorificSuffix?: HonorificSuffix;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public honorificPrefix?: HonorificPrefix;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<PersonName>((p) => p.givenName)]: GivenName.valueHints,
                [nameof<PersonName>((p) => p.middleName)]: MiddleName.valueHints,
                [nameof<PersonName>((p) => p.surname)]: Surname.valueHints,
                [nameof<PersonName>((p) => p.honorificSuffix)]: HonorificSuffix.valueHints,
                [nameof<PersonName>((p) => p.honorificPrefix)]: HonorificPrefix.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<PersonName>((p) => p.givenName)]: GivenName.renderHints,
                [nameof<PersonName>((p) => p.middleName)]: MiddleName.renderHints,
                [nameof<PersonName>((p) => p.surname)]: Surname.renderHints,
                [nameof<PersonName>((p) => p.honorificSuffix)]: HonorificSuffix.renderHints,
                [nameof<PersonName>((p) => p.honorificPrefix)]: HonorificPrefix.renderHints
            }
        });
    }

    public static from(value: IPersonName | Omit<PersonNameJSON, "@type">): PersonName {
        return this.fromAny(value);
    }

    public override toString(): string {
        const names = [];
        if (this.honorificPrefix) names.push(this.honorificPrefix.value);
        names.push(this.givenName.value);
        if (this.middleName) names.push(this.middleName.value);
        names.push(this.surname.value);
        if (this.honorificSuffix) names.push(this.honorificSuffix.value);
        return names.join(" ");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): PersonNameJSON {
        return super.toJSON(verbose, serializeAsString) as PersonNameJSON;
    }
}
