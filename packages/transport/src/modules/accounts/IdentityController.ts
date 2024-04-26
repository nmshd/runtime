import { log } from "@js-soft/ts-utils";
import { CoreBuffer, CryptoSignature, CryptoSignaturePrivateKey, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { ControllerName, CoreAddress, CoreCrypto, CoreErrors, TransportController } from "../../core";
import { IdentityStatusChangedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { DeviceSecretType } from "../devices/DeviceSecretController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { IdentityAuthClient } from "./backbone/IdentityAuthClient";
import { Identity } from "./data/Identity";
import { IdentityDeletionProcess } from "./data/IdentityDeletionProcess";
import { IdentityDeletionProcessStatus } from "./data/IdentityDeletionProcessStatus";
import { Realm } from "./data/Realm";

export class IdentityController extends TransportController {
    public identityClient: IdentityAuthClient;
    public identityDeletionProcessCollection: SynchronizedCollection;

    public get address(): CoreAddress {
        return this._identity.address;
    }

    public get publicKey(): CryptoSignaturePublicKey {
        return this._identity.publicKey;
    }

    public get realm(): Realm {
        return this._identity.realm;
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
        this.identityDeletionProcessCollection = await this.parent.getSynchronizedCollection("IdentityDeletionProcesses");
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

        await this.identityDeletionProcessCollection.create(identityDeletionProcess);
        this.eventBus.publish(new IdentityStatusChangedEvent(this.parent.identity.address.toString(), identityDeletionProcess));

        return identityDeletionProcess;
    }

    public async getIdentityDeletionProcesses(): Promise<IdentityDeletionProcess[]> {
        return (await this.identityDeletionProcessCollection.find())
            .map((identityDeletionProcess) => (identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined))
            .filter((identityDeletionProcess) => !!identityDeletionProcess) as IdentityDeletionProcess[];
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess | undefined> {
        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne({ id: identityDeletionProcessId });
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }
    // TODO: Simon: möchte App alle (z.T. historischen) DeletionProzesse erhalten?

    public async getActiveIdentityDeletionProcess(): Promise<IdentityDeletionProcess | undefined> {
        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne({
            $and: [{ status: { $ne: IdentityDeletionProcessStatus.Cancelled } }, { status: { $ne: IdentityDeletionProcessStatus.Rejected } }]
        });
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }

    public async cancelIdentityDeletion(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessResponse = await this.identityClient.cancelIdentityDeletionProcess(identityDeletionProcessId);
        const identityDeletionProcess = IdentityDeletionProcess.from(identityDeletionProcessResponse.value);

        const oldIdentityDeletion = await this.identityDeletionProcessCollection.findOne({ id: identityDeletionProcessId });

        await this.identityDeletionProcessCollection.update(oldIdentityDeletion, identityDeletionProcess);
        this.eventBus.publish(new IdentityStatusChangedEvent(this.parent.identity.address.toString(), identityDeletionProcess));

        return identityDeletionProcess;
    }
}
