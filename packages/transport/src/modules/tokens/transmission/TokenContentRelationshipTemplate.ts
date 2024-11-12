import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, ICoreBuffer, ICryptoSecretKey } from "@nmshd/crypto";
import { TransportCoreErrors } from "../../../core/TransportCoreErrors";

export interface ITokenContentRelationshipTemplate extends ISerializable {
    templateId: ICoreId;
    secretKey: ICryptoSecretKey;
    forIdentity?: ICoreAddress;
    passwordType?: string;
    salt?: ICoreBuffer;
}

@type("TokenContentRelationshipTemplate")
export class TokenContentRelationshipTemplate extends Serializable implements ITokenContentRelationshipTemplate {
    @validate()
    @serialize()
    public templateId: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate({ nullable: true })
    @serialize()
    public forIdentity?: CoreAddress;

    @validate({ nullable: true, regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType?: string;

    @validate({ nullable: true, customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt?: CoreBuffer;

    public static from(value: ITokenContentRelationshipTemplate): TokenContentRelationshipTemplate {
        const content = this.fromAny(value);
        if (!content.passwordType !== !content.salt) {
            throw TransportCoreErrors.tokens.invalidTokenContentRelationshipTemplate("It's not possible to have only one of passwordType and salt set.");
        }
        return content;
    }
}
