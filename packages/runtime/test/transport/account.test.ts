import { CoreDate } from "@nmshd/transport";
import { DateTime } from "luxon";
import { DeviceDTO, DeviceOnboardingInfoDTO, TransportServices } from "../../src";
import { RuntimeServiceProvider, uploadFile } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let rTransportServices: TransportServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableDatawallet: true });
    sTransportServices = runtimeServices[0].transport;
    rTransportServices = runtimeServices[1].transport;
}, 30000);
afterAll(async () => await serviceProvider.stop());

describe("Sync", () => {
    test("should return the same promise when calling syncEverything twice without awaiting", async () => {
        const [syncResult1, syncResult2] = await Promise.all([sTransportServices.account.syncEverything(), sTransportServices.account.syncEverything()]);

        // The sync results should have the same reference (CAUTION: expect(...).toStrictEqual(...) is not sufficient)
        expect(syncResult1).toBe(syncResult2);
    });

    test("should query the syncRun", async () => {
        const syncRunResponse = await sTransportServices.account.getSyncInfo();
        expect(syncRunResponse).toBeSuccessful();

        const syncRun = syncRunResponse.value;
        const dateTime = DateTime.fromISO(syncRun.lastSyncRun!.completedAt);
        expect(dateTime.isValid).toBeTruthy();
    });
});

describe("Automatic Datawallet Sync", () => {
    async function getSyncInfo() {
        const sync = await sTransportServices.account.getSyncInfo();
        expect(sync).toBeSuccessful();
        return sync.value;
    }

    test("should run an automatic datawallet sync", async () => {
        await sTransportServices.account.syncDatawallet();
        const oldSyncTime = await getSyncInfo();

        await uploadFile(sTransportServices);
        const newSyncTime = await getSyncInfo();

        expect(oldSyncTime).not.toStrictEqual(newSyncTime);
    });

    test("should not run an automatic datawallet sync", async () => {
        const disableResult = await sTransportServices.account.disableAutoSync();
        expect(disableResult).toBeSuccessful();

        await sTransportServices.account.syncDatawallet();
        const oldSyncTime = await getSyncInfo();

        await uploadFile(sTransportServices);
        expect(await getSyncInfo()).toStrictEqual(oldSyncTime);

        const enableResult = await sTransportServices.account.enableAutoSync();
        expect(enableResult).toBeSuccessful();

        expect(await getSyncInfo()).not.toStrictEqual(oldSyncTime);
    });
});

describe("IdentityInfo", () => {
    test("should get the IndentityInformation", async () => {
        const identityInfoResult = await sTransportServices.account.getIdentityInfo();
        expect(identityInfoResult).toBeSuccessful();

        const identityInfo = identityInfoResult.value;
        expect(identityInfo.address.length).toBeLessThanOrEqual(36);
        expect(identityInfo.address.length).toBeGreaterThanOrEqual(35);
        expect(identityInfo.address).toMatch(/^id1/);
        expect(identityInfo.publicKey).toHaveLength(82);
    });
});

describe("LoadItemFromTruncatedReference", () => {
    describe("File", () => {
        let fileReference: string;
        let fileTokenReference: string;

        beforeAll(async () => {
            const file = await uploadFile(sTransportServices);
            fileReference = file.truncatedReference;
            fileTokenReference = (await sTransportServices.files.createTokenForFile({ fileId: file.id })).value.truncatedReference;
        });

        test("loads the File with the truncated reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: fileReference });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: fileTokenReference });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });
    });

    describe("RelationshipTemplate", () => {
        let relationshipTemplateReference: string;
        let relationshipTemplateTokenReference: string;

        beforeAll(async () => {
            const relationshipTemplate = (
                await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate({
                    content: {},
                    expiresAt: CoreDate.utc().add({ days: 1 }).toISOString()
                })
            ).value;
            relationshipTemplateReference = relationshipTemplate.truncatedReference;
            relationshipTemplateTokenReference = (await sTransportServices.relationshipTemplates.createTokenForOwnTemplate({ templateId: relationshipTemplate.id })).value
                .truncatedReference;
        });

        test("loads the RelationshipTemplate with the truncated reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: relationshipTemplateReference });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: relationshipTemplateTokenReference });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });
    });

    describe("Token", () => {
        let tokenReference: string;

        beforeAll(async () => {
            const token = (await sTransportServices.tokens.createOwnToken({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(), ephemeral: true })).value;
            tokenReference = token.truncatedReference;
        });

        test("loads the Token with the truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: tokenReference });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("Token");
        });
    });

    describe("DeviceOnboardingInfo", () => {
        let device: DeviceDTO;

        beforeAll(async () => {
            device = (await sTransportServices.devices.createDevice({})).value;
        });

        test("loads the DeviceOnboardingInfo with the truncated reference", async () => {
            const deviceOnboardingInfoReference = (await sTransportServices.devices.getDeviceOnboardingToken({ id: device.id })).value.truncatedReference;

            const result = await sTransportServices.account.loadItemFromTruncatedReference({ reference: deviceOnboardingInfoReference });

            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("DeviceOnboardingInfo");
        });

        test("loads the DeviceOnboardingInfo with the truncated reference including a profile name", async () => {
            const profileName = "aProfileName";
            const deviceOnboardingInfoReference = (await sTransportServices.devices.getDeviceOnboardingToken({ id: device.id, profileName })).value.truncatedReference;

            const result = await sTransportServices.account.loadItemFromTruncatedReference({ reference: deviceOnboardingInfoReference });

            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("DeviceOnboardingInfo");
            expect((result.value.value as DeviceOnboardingInfoDTO).profileName).toBe(profileName);
        });
    });
});

describe("Un-/RegisterPushNotificationToken", () => {
    test("register with invalid environment", async () => {
        const result = await sTransportServices.account.registerPushNotificationToken({
            handle: "handle",
            platform: "platform",
            appId: "appId",
            // @ts-expect-error
            environment: "invalid"
        });

        expect(result).toBeAnError("environment must be equal to one of the allowed values", "error.runtime.validation.invalidPropertyValue");
    });

    test.each(["Development", "Production"])("register with valid enviroment", async (environment: any) => {
        const result = await sTransportServices.account.registerPushNotificationToken({
            handle: "handle",
            platform: "platform",
            appId: "appId",
            environment: environment
        });

        expect(result).toBeSuccessful();
    });

    test("unregister", async () => {
        const result = await sTransportServices.account.unregisterPushNotificationToken();

        expect(result).toBeSuccessful();
    });
});
