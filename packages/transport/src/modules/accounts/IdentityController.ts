import { log, Result } from "@js-soft/ts-utils";
import { CoreAddress } from "@nmshd/core-types";
import { CoreBuffer, CryptoSignature, CryptoSignaturePrivateKey, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { ControllerName, CoreCrypto, TransportController, TransportCoreErrors } from "../../core/index.js";
import { AccountController } from "../accounts/AccountController.js";
import { DeviceSecretType } from "../devices/DeviceSecretController.js";
import { IdentityClient } from "./backbone/IdentityClient.js";
import { Identity } from "./data/Identity.js";

export class IdentityController extends TransportController {
    public identityClient: IdentityClient;

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

        this.identityClient = new IdentityClient(this.config, this.transport.correlator);
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
            throw TransportCoreErrors.secrets.secretNotFound(DeviceSecretType.IdentitySignature);
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

    public async checkIfIdentityIsDeleted(): Promise<
        Result<{
            isDeleted: boolean;
            deletionDate?: string;
        }>
    > {
        const currentDeviceCredentials = await this.parent.activeDevice.getCredentials();
        const identityDeletionResult = await this.identityClient.checkIfIdentityIsDeleted(currentDeviceCredentials.username);

        if (identityDeletionResult.isError) return Result.fail(identityDeletionResult.error);

        return Result.ok({
            isDeleted: identityDeletionResult.value.isDeleted,
            deletionDate: identityDeletionResult.value.deletionDate ?? undefined
        });
    }
}
