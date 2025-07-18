import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { nameof } from "ts-simple-nameof";
import {
    AccountController,
    AnonymousTokenController,
    CertificateIssuer,
    ChallengeController,
    DeviceController,
    DevicesController,
    DeviceSecretController,
    FileController,
    IdentityController,
    MessageController,
    RelationshipsController,
    RelationshipSecretController,
    RelationshipTemplateController,
    SecretController,
    SyncController,
    TokenController,
    Transport
} from "../../src";
import { TestUtil } from "../testHelpers/TestUtil";

const publicFunctions: any = {};

publicFunctions[AccountController.name] = [
    nameof<AccountController>((r) => r.init),
    nameof<AccountController>((r) => r.close),
    nameof<AccountController>((r) => r.syncDatawallet),
    nameof<AccountController>((r) => r.syncEverything),
    nameof<AccountController>((r) => r.registerPushNotificationToken),
    nameof<AccountController>((r) => r.fetchDeviceInfo)
];

publicFunctions[DeviceController.name] = [
    nameof<DeviceController>((r) => r.init),
    nameof<DeviceController>((r) => r.changePassword),
    nameof<DeviceController>((r) => r.update),
    nameof<DeviceController>((r) => r.sign),
    nameof<DeviceController>((r) => r.verify),
    nameof<DeviceController>((r) => r.getCredentials)
];

publicFunctions[DevicesController.name] = [
    nameof<DevicesController>((r) => r.init),
    nameof<DevicesController>((r) => r.get),
    nameof<DevicesController>((r) => r.sendDevice),
    nameof<DevicesController>((r) => r.getSharedSecret),
    nameof<DevicesController>((r) => r.update),
    nameof<DevicesController>((r) => r.delete),
    nameof<DevicesController>((r) => r.list)
];

publicFunctions[DeviceSecretController.name] = [
    nameof<DeviceSecretController>((r) => r.init),
    nameof<DeviceSecretController>((r) => r.storeSecret),
    nameof<DeviceSecretController>((r) => r.loadSecret),
    nameof<DeviceSecretController>((r) => r.deleteSecret),
    nameof<DeviceSecretController>((r) => r.createDeviceSharedSecret),
    nameof<DeviceSecretController>((r) => r.encryptDatawalletModificationPayload),
    nameof<DeviceSecretController>((r) => r.decryptDatawalletModificationPayload)
];

publicFunctions[IdentityController.name] = [
    nameof<IdentityController>((r) => r.init),
    nameof<IdentityController>((r) => r.isMe),
    nameof<IdentityController>((r) => r.update),
    nameof<IdentityController>((r) => r.sign),
    nameof<IdentityController>((r) => r.verify)
];

publicFunctions[CertificateIssuer.name] = [nameof<CertificateIssuer>((r) => r.init), nameof<CertificateIssuer>((r) => r.issueCertificate)];

publicFunctions[ChallengeController.name] = [
    nameof<ChallengeController>((r) => r.init),
    nameof<ChallengeController>((r) => r.validateChallenge),
    nameof<ChallengeController>((r) => r.createAccountCreationChallenge),
    nameof<ChallengeController>((r) => r.createChallenge)
];

publicFunctions[SyncController.name] = [nameof<SyncController>((r) => r.init), nameof<SyncController>((r) => r.sync), nameof<SyncController>((r) => r.getLastCompletedSyncTime)];

publicFunctions[FileController.name] = [
    nameof<FileController>((r) => r.init),
    nameof<FileController>((r) => r.getFiles),
    nameof<FileController>((r) => r.getFile),
    nameof<FileController>((r) => r.getOrLoadFileByReference),
    nameof<FileController>((r) => r.getOrLoadFile),
    nameof<FileController>((r) => r.sendFile),
    nameof<FileController>((r) => r.downloadFileContent),
    nameof<FileController>((r) => r.updateCache)
];
publicFunctions[MessageController.name] = [
    nameof<MessageController>((r) => r.init),
    nameof<MessageController>((r) => r.getMessages),
    nameof<MessageController>((r) => r.getMessage),
    nameof<MessageController>((r) => r.sendMessage)
];
publicFunctions[RelationshipsController.name] = [
    nameof<RelationshipsController>((r) => r.init),
    nameof<RelationshipsController>((r) => r.getRelationships),
    nameof<RelationshipsController>((r) => r.getRelationshipToIdentity),
    nameof<RelationshipsController>((r) => r.getActiveRelationshipToIdentity),
    nameof<RelationshipsController>((r) => r.getExistingRelationshipToIdentity),
    nameof<RelationshipsController>((r) => r.getRelationship),
    nameof<RelationshipsController>((r) => r.sign),
    nameof<RelationshipsController>((r) => r.verify),
    nameof<RelationshipsController>((r) => r.verifyIdentity),
    nameof<RelationshipsController>((r) => r.sendRelationship),
    nameof<RelationshipsController>((r) => r.accept),
    nameof<RelationshipsController>((r) => r.reject),
    nameof<RelationshipsController>((r) => r.revoke)
];
publicFunctions[RelationshipSecretController.name] = [
    nameof<RelationshipSecretController>((r) => r.init),
    nameof<RelationshipSecretController>((r) => r.createRequestorSecrets),
    nameof<RelationshipSecretController>((r) => r.createTemplatorSecrets),
    nameof<RelationshipSecretController>((r) => r.getPublicCreationResponseContentCrypto),
    nameof<RelationshipSecretController>((r) => r.convertSecrets),
    nameof<RelationshipSecretController>((r) => r.deleteSecretForRelationship),
    nameof<RelationshipSecretController>((r) => r.decryptTemplate),
    nameof<RelationshipSecretController>((r) => r.verifyTemplate),
    nameof<RelationshipSecretController>((r) => r.encryptCreationContent),
    nameof<RelationshipSecretController>((r) => r.encrypt),
    nameof<RelationshipSecretController>((r) => r.decryptCreationContent),
    nameof<RelationshipSecretController>((r) => r.createTemplateKey),
    nameof<RelationshipSecretController>((r) => r.decryptPeer),
    nameof<RelationshipSecretController>((r) => r.verifyOwn),
    nameof<RelationshipSecretController>((r) => r.verifyPeer)
];
publicFunctions[RelationshipTemplateController.name] = [
    nameof<RelationshipTemplateController>((r) => r.init),
    nameof<RelationshipTemplateController>((r) => r.sendRelationshipTemplate),
    nameof<RelationshipTemplateController>((r) => r.deleteRelationshipTemplate),
    nameof<RelationshipTemplateController>((r) => r.getRelationshipTemplates),
    nameof<RelationshipTemplateController>((r) => r.getRelationshipTemplate),
    nameof<RelationshipTemplateController>((r) => r.updateCache)
];
publicFunctions[SecretController.name] = [
    nameof<SecretController>((r) => r.init),
    nameof<SecretController>((r) => r.storeSecret),
    nameof<SecretController>((r) => r.loadSecretsByName),
    nameof<SecretController>((r) => r.loadActiveSecretByName),
    nameof<SecretController>((r) => r.succeedSecretWithName),
    nameof<SecretController>((r) => r.loadSecretById),
    nameof<SecretController>((r) => r.deleteSecretById),
    nameof<SecretController>((r) => r.createExchangeKey)
];
publicFunctions[TokenController.name] = [
    nameof<TokenController>((r) => r.init),
    nameof<TokenController>((r) => r.getTokens),
    nameof<TokenController>((r) => r.sendToken),
    nameof<TokenController>((r) => r.getToken),
    nameof<TokenController>((r) => r.loadPeerTokenByReference)
];

publicFunctions[AnonymousTokenController.name] = [nameof<AnonymousTokenController>((r) => r.loadPeerTokenByReference)];

let account: AccountController;
const controllers: any = {};

function testPublicFunctions(controllerName: string) {
    test(`${controllerName} should expose the correct API`, function () {
        let found = 0;
        for (const functionName of publicFunctions[controllerName]) {
            const item = controllers[controllerName][functionName];
            if (!item || typeof item !== "function") continue;
            found++;
        }
        expect(found).toStrictEqual(publicFunctions[controllerName].length);
    });
}

describe("PublicAPI", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        account = accounts[0];
        controllers[AccountController.name] = account;
        controllers[DeviceController.name] = account.activeDevice;
        controllers[DevicesController.name] = account.devices;
        controllers[DeviceSecretController.name] = account.activeDevice.secrets;
        controllers[IdentityController.name] = account.identity;
        controllers[CertificateIssuer.name] = account.certificateIssuer;
        controllers[ChallengeController.name] = account.challenges;
        controllers[FileController.name] = account.files;
        controllers[MessageController.name] = account.messages;
        controllers[RelationshipsController.name] = account.relationships;
        controllers[RelationshipSecretController.name] = await new RelationshipSecretController(account).init();
        controllers[RelationshipTemplateController.name] = account.relationshipTemplates;
        controllers[SecretController.name] = await new SecretController(account).init();
        controllers[SyncController.name] = (account as any).synchronization;
        controllers[TokenController.name] = account.tokens;
        controllers[AnonymousTokenController.name] = new AnonymousTokenController(transport.config);
    });

    for (const controllerName in publicFunctions) {
        testPublicFunctions(controllerName);
    }

    afterAll(async function () {
        await account.close();
        await connection.close();
    });
});
