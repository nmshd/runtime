import { serialize, type, validate } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
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
    public static readonly propertyNames = nameOf<PersonName, never>();

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
                [this.propertyNames.givenName.$path]: GivenName.valueHints,
                [this.propertyNames.middleName.$path]: MiddleName.valueHints,
                [this.propertyNames.surname.$path]: Surname.valueHints,
                [this.propertyNames.honorificSuffix.$path]: HonorificSuffix.valueHints,
                [this.propertyNames.honorificPrefix.$path]: HonorificPrefix.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.givenName.$path]: GivenName.renderHints,
                [this.propertyNames.middleName.$path]: MiddleName.renderHints,
                [this.propertyNames.surname.$path]: Surname.renderHints,
                [this.propertyNames.honorificSuffix.$path]: HonorificSuffix.renderHints,
                [this.propertyNames.honorificPrefix.$path]: HonorificPrefix.renderHints
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
