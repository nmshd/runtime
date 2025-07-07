import { CoreDate } from "@nmshd/core-types";
import { DateTime } from "luxon";
import { DatawalletSynchronizedEvent, DeviceDTO, DeviceOnboardingInfoDTO, FileDTO, RelationshipTemplateDTO, TokenDTO, TransportServices } from "../../src";
import { emptyRelationshipTemplateContent, MockEventBus, RuntimeServiceProvider, uploadFile } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let rTransportServices: TransportServices;

let sEventBus: MockEventBus;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableDatawallet: true });
    sTransportServices = runtimeServices[0].transport;
    rTransportServices = runtimeServices[1].transport;

    sEventBus = runtimeServices[0].eventBus;
}, 30000);

beforeEach(() => sEventBus.reset());

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

    test("should receive a DatawalletSynchronizedEvent", async () => {
        await sTransportServices.account.syncDatawallet();

        await expect(sEventBus).toHavePublished(DatawalletSynchronizedEvent);
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
        expect(identityInfo.address).toMatch(/^did:e:[a-zA-Z0-9.-]+:dids:[0-9a-f]{22}$/);
        expect(identityInfo.publicKey).toHaveLength(82);
    });
});

describe("LoadItemFromReference", () => {
    describe("File", () => {
        let file: FileDTO;
        let fileToken: TokenDTO;

        beforeAll(async () => {
            file = await uploadFile(sTransportServices);
            fileToken = (await sTransportServices.files.createTokenForFile({ fileId: file.id })).value;
        });

        test("loads the File with the truncated reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: file.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the url reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: file.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: fileToken.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the url Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: fileToken.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });
    });

    describe("RelationshipTemplate", () => {
        let relationshipTemplate: RelationshipTemplateDTO;
        let relationshipTemplateToken: TokenDTO;

        beforeAll(async () => {
            relationshipTemplate = (
                await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate({
                    content: emptyRelationshipTemplateContent,
                    expiresAt: CoreDate.utc().add({ days: 1 }).toISOString()
                })
            ).value;
            relationshipTemplateToken = (await sTransportServices.relationshipTemplates.createTokenForOwnRelationshipTemplate({ templateId: relationshipTemplate.id })).value;
        });

        test("loads the RelationshipTemplate with the truncated reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: relationshipTemplate.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the url reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: relationshipTemplate.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: relationshipTemplateToken.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the url Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromReference({ reference: relationshipTemplateToken.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });
    });

    describe("Token", () => {
        test("loads the Token with the truncated Token reference", async () => {
            const token = (await sTransportServices.tokens.createOwnToken({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(), ephemeral: true })).value;
            const result = await rTransportServices.account.loadItemFromReference({ reference: token.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("Token");
        });

        test("loads the Token with the url Token reference", async () => {
            const token = (await sTransportServices.tokens.createOwnToken({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(), ephemeral: true })).value;
            const result = await rTransportServices.account.loadItemFromReference({ reference: token.reference.url });
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
            const deviceOnboardingInfoReference = (await sTransportServices.devices.createDeviceOnboardingToken({ id: device.id })).value.truncatedReference;

            const result = await sTransportServices.account.loadItemFromReference({ reference: deviceOnboardingInfoReference });

            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("DeviceOnboardingInfo");
        });

        test("loads the DeviceOnboardingInfo with the truncated reference including a profile name", async () => {
            const profileName = "aProfileName";
            const deviceOnboardingInfoReference = (await sTransportServices.devices.createDeviceOnboardingToken({ id: device.id, profileName })).value.truncatedReference;

            const result = await sTransportServices.account.loadItemFromReference({ reference: deviceOnboardingInfoReference });

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
            handle: "handleLongerThan10Characters",
            platform: "dummy",
            appId: "appId",
            environment: environment
        });

        expect(result).toBeSuccessful();
        expect(result.value.devicePushIdentifier).toMatch(/^DPI[a-zA-Z0-9]{17}$/);
    });

    test("unregister", async () => {
        const result = await sTransportServices.account.unregisterPushNotificationToken();

        expect(result).toBeSuccessful();
    });
});

describe("CheckIfIdentityIsDeleted", () => {
    test("check deletion of Identity that is not deleted", async () => {
        const result = await sTransportServices.account.checkIfIdentityIsDeleted();
        expect(result).toBeSuccessful();
        expect(result.value.isDeleted).toBe(false);
        expect(result.value.deletionDate).toBeUndefined();
    });

    test("check deletion of Identity that has IdentityDeletionProcess with expired grace period", async () => {
        const identityDeletionProcess = await sTransportServices.identityDeletionProcesses.initiateIdentityDeletionProcess({ lengthOfGracePeriodInDays: 0 });

        const result = await sTransportServices.account.checkIfIdentityIsDeleted();
        expect(result).toBeSuccessful();
        expect(result.value.isDeleted).toBe(true);
        expect(result.value.deletionDate).toBe(identityDeletionProcess.value.gracePeriodEndsAt!.toString());
    });
});
