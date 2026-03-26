import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { TokenReference } from "../transmission/TokenReference";

export interface IEmptyToken extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    expiresAt: ICoreDate;
}

@type("EmptyToken")
export class EmptyToken extends CoreSynchronizable implements IEmptyToken {
    public override readonly technicalProperties = ["@type", "@context", nameof<EmptyToken>((r) => r.secretKey), nameof<EmptyToken>((r) => r.expiresAt)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    public static from(value: IEmptyToken): EmptyToken {
        return this.fromAny(value);
    }

    public toTokenReference(backboneBaseUrl: string): TokenReference {
        return TokenReference.from({
            id: this.id,
            backboneBaseUrl,
            key: this.secretKey
        });
    }
}
