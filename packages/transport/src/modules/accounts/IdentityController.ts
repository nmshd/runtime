import { log } from "@js-soft/ts-utils";
import { CoreAddress } from "@nmshd/core-types";
import { CoreBuffer, CryptoSignature, CryptoSignaturePrivateKey, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { ControllerName, CoreCrypto, CoreErrors, TransportController } from "../../core";
import { AccountController } from "../accounts/AccountController";
import { DeviceSecretType } from "../devices/DeviceSecretController";
import { Identity } from "./data/Identity";

export class IdentityController extends TransportController {
    public get address(): CoreAddress {
        return this._identity.address;
    }

    public get publicKey(): CryptoSignaturePublicKey {
        return this._identity.publicKey;
    }

    public get identity(): Identity {
        return this._identity;
    }
    private _identity: Identity;

    public constructor(parent: AccountController) {
        super(ControllerName.Identity, parent);
    }

    @log()
    public override async init(identity: Identity): Promise<IdentityController> {
        await super.init();

        this._identity = identity;
        return this;
    }

    public isMe(address: CoreAddress): boolean {
        return this.address.equals(address);
    }

    public async update(): Promise<void> {
        await this.parent.info.set("identity", this.identity);
    }

    @log()
    public async sign(content: CoreBuffer): Promise<CryptoSignature> {
        const privateKeyContainer = await this.parent.activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature);
        if (!privateKeyContainer || !(privateKeyContainer.secret instanceof CryptoSignaturePrivateKey)) {
            throw CoreErrors.secrets.secretNotFound(DeviceSecretType.IdentitySignature);
        }
        const privateKey = privateKeyContainer.secret;

        const signature = await CoreCrypto.sign(content, privateKey);
        privateKey.clear();
        return signature;
    }

    public async verify(content: CoreBuffer, signature: CryptoSignature): Promise<boolean> {
        const valid = await CoreCrypto.verify(content, signature, this.publicKey);
        return valid;
    }
}
