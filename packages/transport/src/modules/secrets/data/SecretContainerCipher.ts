import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CryptoCipher, ICryptoCipher } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core/CoreSynchronizable.js";

export interface ISecretContainerCipher extends ICoreSynchronizable {
    name: string;
    description?: string;
    createdAt: ICoreDate;
    nonce?: number;
    validFrom: ICoreDate;
    validTo?: ICoreDate;
    active: boolean;
    cipher: ICryptoCipher;
}

@type("SecretContainerCipher")
export class SecretContainerCipher extends CoreSynchronizable implements ISecretContainerCipher {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<SecretContainerCipher>((x) => x.name),
        nameof<SecretContainerCipher>((x) => x.description),
        nameof<SecretContainerCipher>((x) => x.createdAt),
        nameof<SecretContainerCipher>((x) => x.validFrom),
        nameof<SecretContainerCipher>((x) => x.validTo),
        nameof<SecretContainerCipher>((x) => x.nonce),
        nameof<SecretContainerCipher>((x) => x.active),
        nameof<SecretContainerCipher>((x) => x.cipher)
    ];

    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    @serialize()
    @validate({ nullable: true })
    public name: string = "";

    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    @serialize()
    @validate({ nullable: true })
    public description: string = "";

    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate()
    public validFrom: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public nonce?: number;

    @serialize()
    @validate()
    public active: boolean;

    @serialize()
    @validate()
    public cipher: CryptoCipher;

    public static from(value: ISecretContainerCipher): SecretContainerCipher {
        return this.fromAny(value);
    }
}
