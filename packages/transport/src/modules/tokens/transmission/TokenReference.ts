import { type } from "@js-soft/ts-serval";
import { IReference, Reference } from "@nmshd/core-types";
import { BackboneIds } from "../../../core/index.js";

export interface ITokenReference extends IReference {}

@type("TokenReference")
export class TokenReference extends Reference implements ITokenReference {
    protected static override preFrom(value: any): any {
        super.validateId(value, BackboneIds.token);

        return value;
    }

    public static override from(value: ITokenReference | string): TokenReference {
        return super.from(value);
    }
}
