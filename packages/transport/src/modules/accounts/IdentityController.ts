import { log } from "@js-soft/ts-utils";
import { CoreBuffer, CryptoSignature, CryptoSignaturePrivateKey, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { ControllerName, CoreAddress, CoreCrypto, CoreErrors, TransportController } from "../../core";
import { IdentityStatusChangedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { DeviceSecretType } from "../devices/DeviceSecretController";
import { IdentityAuthClient } from "./backbone/IdentityAuthClient";
import { Identity, IdentityStatus } from "./data/Identity";
import { IdentityDeletionProcess } from "./data/IdentityDeletionProcess";
import { Realm } from "./data/Realm";

export class IdentityController extends TransportController {
    public identityClient: IdentityAuthClient;

    public get address(): CoreAddress {
        return this._identity.address;
    }

    public get publicKey(): CryptoSignaturePublicKey {
        return this._identity.publicKey;
    }

    public get realm(): Realm {
        return this._identity.realm;
    }

    public get status(): IdentityStatus {
        return this._identity.status;
    }

    public get identity(): Identity {
        return this._identity;
    }
    private _identity: Identity;

    public constructor(parent: AccountController) {
        super(ControllerName.Identity, parent);

        this.identityClient = new IdentityAuthClient(this.config, this.parent.authenticator);
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

    public async initiateIdentityDeletion(): Promise<IdentityDeletionProcess> {
        const initiateIdentityDeletionResponse = await this.identityClient.initiateIdentityDeletion();
        const identityDeletionProcess = IdentityDeletionProcess.from(initiateIdentityDeletionResponse.value);

        this._identity.status = IdentityStatus.ToBeDeleted;
        this.eventBus.publish(new IdentityStatusChangedEvent(this.parent.identity.address.toString(), this.status));

        return identityDeletionProcess;
    }

    // TODO: rename getIdentityDeletionProcesses
    public async getIdentityDeletions(): Promise<IdentityDeletionProcess[]> {
        return (await this.identityClient.getIdentityDeletionProcesses()).value.map((identityDeletionProcessJSON) => IdentityDeletionProcess.from(identityDeletionProcessJSON));
    }

    // TODO: rename getIdentityDeletionProcess
    public async getIdentityDeletion(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        return IdentityDeletionProcess.from((await this.identityClient.getIdentityDeletionProcess(identityDeletionProcessId)).value);
    }

    // TODO: Simon: möchte App alle (z.T. historischen) DeletionProzesse erhalten?
}
