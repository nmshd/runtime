import { ISerializable, ISerialized, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";

export interface IChallengeSignedSerialized extends ISerialized {
    challenge: string;
    signature: string;
}

export interface IChallengeSigned extends ISerializable {
    challenge: string;
    signature: ICryptoSignature;
}

@type("ChallengeSigned")
export class ChallengeSigned extends Serializable implements IChallengeSigned {
    @validate()
    @serialize({ enforceString: true })
    public challenge: string;

    @validate()
    @serialize({ enforceString: true })
    public signature: CryptoSignature;

    public static from(value: IChallengeSigned): ChallengeSigned {
        return this.fromAny(value);
    }

    public static fromJSON(value: IChallengeSignedSerialized): ChallengeSigned {
        const signature = CryptoSignature.fromBase64(value.signature);

        return this.from({ signature: signature, challenge: value.challenge });
    }

    public override toJSON(verbose = true): IChallengeSignedSerialized {
        const obj: IChallengeSignedSerialized = {
            challenge: this.challenge,
            signature: this.signature.toBase64()
        };
        if (verbose) {
            obj["@type"] = "ChallengeSigned";
        }
        return obj;
    }
}
