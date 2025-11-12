import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, CryptoSignaturePrivateKey } from "@nmshd/crypto";
import { AccountController, Device, DeviceSecretCredentials, DeviceSecretType, DeviceSharedSecret } from "@nmshd/transport";
import { AppDeviceTest } from "../../testHelpers/AppDeviceTest.js";
import { DeviceTestParameters } from "../../testHelpers/DeviceTestParameters.js";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("Device Onboarding", function () {
    let connection: IDatabaseConnection;

    let deviceTest: AppDeviceTest;

    let device1Account: AccountController;
    let device2Account: AccountController;

    let newDevice: Device;
    let sharedSecret: DeviceSharedSecret;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();

        const parameters = new DeviceTestParameters({ ...TestUtil.createConfig(), datawalletEnabled: true }, connection, TestUtil.loggerFactory);
        deviceTest = new AppDeviceTest(parameters);

        await deviceTest.init();

        device1Account = await deviceTest.createAccount();
    });

    afterAll(async function () {
        await deviceTest.close();

        await connection.close();
    });

    test("should create correct device", async function () {
        newDevice = await device1Account.devices.sendDevice({ name: "aDeviceName", isAdmin: true });
        await device1Account.syncDatawallet();
        expect(newDevice).toBeInstanceOf(Device);
        expect(newDevice.name).toBe("aDeviceName");
        expect(newDevice.publicKey).toBeUndefined();
        expect(newDevice.operatingSystem).toBeUndefined();
        expect(newDevice.lastLoginAt).toBeUndefined();
        expect(newDevice.initialPassword!.length).toBeLessThan(51);
        expect(newDevice.initialPassword!.length).toBeGreaterThan(44);
        expect(newDevice.username).toBeDefined();
        expect(newDevice.id).toBeInstanceOf(CoreId);
        expect(newDevice.createdAt).toBeInstanceOf(CoreDate);
        expect(newDevice.createdByDevice).toBeInstanceOf(CoreId);
        expect(newDevice.createdByDevice.toString()).toBe(device1Account.activeDevice.id.toString());
    });

    test("should list all devices correctly", async function () {
        const devices = await device1Account.devices.list();
        expect(devices).toHaveLength(2);
        expect(devices[0].id.toString()).toBe(device1Account.activeDevice.id.toString());
        expect(devices[1].id.toString()).toBe(newDevice.id.toString());
    });

    test("should create correct device shared secret", async function () {
        sharedSecret = await device1Account.activeDevice.secrets.createDeviceSharedSecret(newDevice, 1, true);
        expect(sharedSecret).toBeInstanceOf(DeviceSharedSecret);
        expect(sharedSecret.id.toString()).toBe(newDevice.id.toString());
        expect(JSON.stringify(sharedSecret.identity.toJSON(false))).toBe(JSON.stringify(device1Account.identity.identity.toJSON(false)));
        expect(sharedSecret.username).toBe(newDevice.username);
        expect(sharedSecret.password).toBe(newDevice.initialPassword);
        expect(sharedSecret.synchronizationKey).toBeInstanceOf(CryptoSecretKey);
        expect(sharedSecret.identityPrivateKey).toBeInstanceOf(CryptoSignaturePrivateKey);
    });

    test("should create correct device shared secret via controller", async function () {
        sharedSecret = await device1Account.devices.getSharedSecret(newDevice.id);
        expect(sharedSecret).toBeInstanceOf(DeviceSharedSecret);
        expect(sharedSecret.id.toString()).toBe(newDevice.id.toString());
        expect(JSON.stringify(sharedSecret.identity.toJSON(false))).toBe(JSON.stringify(device1Account.identity.identity.toJSON(false)));
        expect(sharedSecret.username).toBe(newDevice.username);
        expect(sharedSecret.password).toBe(newDevice.initialPassword);
        expect(sharedSecret.synchronizationKey).toBeInstanceOf(CryptoSecretKey);
        expect(sharedSecret.identityPrivateKey).toBeInstanceOf(CryptoSignaturePrivateKey);
    });

    test("should serialize device shared secrets and deserialize them again", function () {
        const serialized = sharedSecret.serialize();
        sharedSecret = DeviceSharedSecret.deserialize(serialized);
        expect(sharedSecret).toBeInstanceOf(DeviceSharedSecret);
        expect(sharedSecret.id.toString()).toBe(newDevice.id.toString());
        expect(JSON.stringify(sharedSecret.identity.toJSON(false))).toBe(JSON.stringify(device1Account.identity.identity.toJSON(false)));
        expect(sharedSecret.username).toBe(newDevice.username);
        expect(sharedSecret.password).toBe(newDevice.initialPassword);
        expect(sharedSecret.synchronizationKey).toBeInstanceOf(CryptoSecretKey);
        expect(sharedSecret.identityPrivateKey).toBeInstanceOf(CryptoSignaturePrivateKey);
    });

    test("should onboard new device with device shared secret", async function () {
        device2Account = await deviceTest.onboardDevice(sharedSecret);
        expect(device2Account).toBeInstanceOf(AccountController);
    });

    test("should be able to login after a device onboarding", async function () {
        await device2Account.init();
        expect(device2Account).toBeInstanceOf(AccountController);
    });

    test("should own the same identity", function () {
        expect(device1Account.identity.identity.toJSON()).toStrictEqual(device2Account.identity.identity.toJSON());
    });

    test("should be able to sign for the existing identity", async function () {
        const testBuffer = CoreBuffer.fromUtf8("Test");
        const dev1Signature = await device1Account.identity.sign(testBuffer);
        const dev2Check = await device2Account.identity.verify(testBuffer, dev1Signature);
        expect(dev2Check).toBe(true);
        const dev2Signature = await device2Account.identity.sign(testBuffer);
        const dev1Check = await device1Account.identity.verify(testBuffer, dev2Signature);
        expect(dev1Check).toBe(true);
    });

    test("should have created a new device keypair", async function () {
        const testBuffer = CoreBuffer.fromUtf8("Test");
        const dev2Signature = await device2Account.activeDevice.sign(testBuffer);
        const dev2Check = await device2Account.activeDevice.verify(testBuffer, dev2Signature);
        expect(dev2Check).toBe(true);

        const dev1Check = await device1Account.activeDevice.verify(testBuffer, dev2Signature);
        expect(dev1Check).toBe(false);

        const dev1Container = await device1Account.activeDevice.secrets.loadSecret(DeviceSecretType.DeviceSignature);
        const dev1Key = dev1Container!.secret as CryptoSignaturePrivateKey;
        expect(dev1Key).toBeInstanceOf(CryptoSignaturePrivateKey);
        const dev2Container = await device2Account.activeDevice.secrets.loadSecret(DeviceSecretType.DeviceSignature);
        const dev2Key = dev2Container!.secret as CryptoSignaturePrivateKey;
        expect(dev2Key).toBeInstanceOf(CryptoSignaturePrivateKey);
        expect(dev1Key.toBase64()).not.toStrictEqual(dev2Key.toBase64());
    });

    test("should own the same synchronization key", async function () {
        const dev1Container = await device2Account.activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature);
        const dev1Key = dev1Container!.secret as CryptoSignaturePrivateKey;
        expect(dev1Key).toBeInstanceOf(CryptoSignaturePrivateKey);
        const dev2Container = await device2Account.activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature);
        const dev2Key = dev2Container!.secret as CryptoSignaturePrivateKey;
        expect(dev2Key).toBeInstanceOf(CryptoSignaturePrivateKey);
        expect(dev1Key.toBase64()).toStrictEqual(dev2Key.toBase64());
    });

    test("should have different onboarding credentials", async function () {
        const dev1Container = await device1Account.activeDevice.secrets.loadSecret(DeviceSecretType.DeviceCredentials);
        const dev1Key = dev1Container!.secret as DeviceSecretCredentials;
        expect(dev1Key).toBeInstanceOf(DeviceSecretCredentials);

        const dev2Container = await device2Account.activeDevice.secrets.loadSecret(DeviceSecretType.DeviceCredentials);
        const dev2Key = dev2Container!.secret as DeviceSecretCredentials;
        expect(dev2Key).toBeInstanceOf(DeviceSecretCredentials);

        expect(dev1Key.id).not.toBe(dev2Key.id);
        expect(dev1Key.username).not.toBe(dev2Key.username);
        expect(dev1Key.password).not.toBe(dev2Key.password);
    });

    test("should have changed the password of the created device (locally)", async function () {
        const dev1Container = await device1Account.activeDevice.secrets.loadSecret(DeviceSecretType.DeviceCredentials);
        const dev1Key = dev1Container!.secret as DeviceSecretCredentials;
        expect(dev1Key).toBeInstanceOf(DeviceSecretCredentials);

        expect(dev1Key.password).not.toBe(newDevice.initialPassword);
    });

    test("should have changed the password of the created device (Backbone)", async function () {
        await expect(async () => {
            await deviceTest.onboardDevice(sharedSecret);
        }).rejects.toThrow("error.transport.request.noAuthGrant");
    });
});
