import { CoreDate } from "@nmshd/core-types";
import { DatawalletSynchronizedEvent, DeviceOnboardingInfoDTO, FileDTO, RelationshipTemplateDTO, TokenDTO } from "@nmshd/runtime";
import { DateTime } from "luxon";
import { emptyRelationshipTemplateContent, MockEventBus, RuntimeServiceProvider, TestRuntimeServices, uploadFile } from "../lib/index.js";

const serviceProvider = new RuntimeServiceProvider();
let sServices: TestRuntimeServices;
let rServices: TestRuntimeServices;

let sEventBus: MockEventBus;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableDatawallet: true });
    sServices = runtimeServices[0];
    rServices = runtimeServices[1];

    sEventBus = runtimeServices[0].eventBus;
}, 30000);

beforeEach(() => sEventBus.reset());

afterAll(async () => await serviceProvider.stop());

describe("Sync", () => {
    test("should return the same promise when calling syncEverything twice without awaiting", async () => {
        const [syncResult1, syncResult2] = await Promise.all([sServices.transport.account.syncEverything(), sServices.transport.account.syncEverything()]);

        // The sync results should have the same reference (CAUTION: expect(...).toStrictEqual(...) is not sufficient)
        expect(syncResult1).toBe(syncResult2);
    });

    test("should query the syncRun", async () => {
        const syncRunResponse = await sServices.transport.account.getSyncInfo();
        expect(syncRunResponse).toBeSuccessful();

        const syncRun = syncRunResponse.value;
        const dateTime = DateTime.fromISO(syncRun.lastSyncRun!.completedAt);
        expect(dateTime.isValid).toBeTruthy();
    });
});

describe("Automatic Datawallet Sync", () => {
    async function getSyncInfo() {
        const sync = await sServices.transport.account.getSyncInfo();
        expect(sync).toBeSuccessful();
        return sync.value;
    }

    test("should run an automatic datawallet sync", async () => {
        await sServices.transport.account.syncDatawallet();
        const oldSyncTime = await getSyncInfo();

        await uploadFile(sServices.transport);
        const newSyncTime = await getSyncInfo();

        expect(oldSyncTime).not.toStrictEqual(newSyncTime);
    });

    test("should receive a DatawalletSynchronizedEvent", async () => {
        await sServices.transport.account.syncDatawallet();

        await expect(sEventBus).toHavePublished(DatawalletSynchronizedEvent);
    });

    test("should not run an automatic datawallet sync", async () => {
        const disableResult = await sServices.transport.account.disableAutoSync();
        expect(disableResult).toBeSuccessful();

        await sServices.transport.account.syncDatawallet();
        const oldSyncTime = await getSyncInfo();

        await uploadFile(sServices.transport);
        expect(await getSyncInfo()).toStrictEqual(oldSyncTime);

        const enableResult = await sServices.transport.account.enableAutoSync();
        expect(enableResult).toBeSuccessful();

        expect(await getSyncInfo()).not.toStrictEqual(oldSyncTime);
    });
});

describe("IdentityInfo", () => {
    test("should get the IndentityInformation", async () => {
        const identityInfoResult = await sServices.transport.account.getIdentityInfo();
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
            file = await uploadFile(sServices.transport);
            fileToken = (await sServices.transport.files.createTokenForFile({ fileId: file.id })).value;
        });

        test("loads the File with the truncated reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: file.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the url reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: file.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the truncated Token reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: fileToken.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("loads the File with the url Token reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: fileToken.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });
    });

    describe("RelationshipTemplate", () => {
        let relationshipTemplate: RelationshipTemplateDTO;
        let relationshipTemplateToken: TokenDTO;

        beforeAll(async () => {
            relationshipTemplate = (
                await sServices.transport.relationshipTemplates.createOwnRelationshipTemplate({
                    content: emptyRelationshipTemplateContent,
                    expiresAt: CoreDate.utc().add({ days: 1 }).toISOString()
                })
            ).value;
            relationshipTemplateToken = (await sServices.transport.relationshipTemplates.createTokenForOwnRelationshipTemplate({ templateId: relationshipTemplate.id })).value;
        });

        test("loads the RelationshipTemplate with the truncated reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: relationshipTemplate.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the url reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: relationshipTemplate.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the truncated Token reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: relationshipTemplateToken.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("loads the RelationshipTemplate with the url Token reference", async () => {
            const result = await rServices.transport.account.loadItemFromReference({ reference: relationshipTemplateToken.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });
    });

    describe("Token", () => {
        test("loads the Token with the truncated Token reference", async () => {
            const token = (await sServices.transport.tokens.createOwnToken({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(), ephemeral: true })).value;
            const result = await rServices.transport.account.loadItemFromReference({ reference: token.reference.truncated });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("Token");
        });

        test("loads the Token with the url Token reference", async () => {
            const token = (await sServices.transport.tokens.createOwnToken({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(), ephemeral: true })).value;
            const result = await rServices.transport.account.loadItemFromReference({ reference: token.reference.url });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("Token");
        });
    });

    describe("DeviceOnboardingInfo", () => {
        test("loads the DeviceOnboardingInfo with the truncated reference", async () => {
            const emptyToken = await sServices.anonymous.tokens.createEmptyToken();
            const fillResult = await sServices.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
            expect(fillResult).toBeSuccessful();

            const result = await sServices.transport.account.loadItemFromReference({ reference: emptyToken.value.reference.url });

            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("DeviceOnboardingInfo");
        });

        test("loads the DeviceOnboardingInfo with the truncated reference including a profile name", async () => {
            const profileName = "aProfileName";
            const emptyToken = await sServices.anonymous.tokens.createEmptyToken();
            const fillResult = await sServices.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated, profileName });
            expect(fillResult).toBeSuccessful();

            const result = await sServices.transport.account.loadItemFromReference({ reference: emptyToken.value.reference.url });

            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("DeviceOnboardingInfo");
            expect((result.value.value as DeviceOnboardingInfoDTO).profileName).toBe(profileName);
        });
    });
});

describe("Un-/RegisterPushNotificationToken", () => {
    test("register with invalid environment", async () => {
        const result = await sServices.transport.account.registerPushNotificationToken({
            handle: "handle",
            platform: "platform",
            appId: "appId",
            // @ts-expect-error
            environment: "invalid"
        });

        expect(result).toBeAnError("environment must be equal to one of the allowed values", "error.runtime.validation.invalidPropertyValue");
    });

    test.each(["Development", "Production", undefined])("register with valid enviroment: %s", async (environment: any) => {
        const result = await sServices.transport.account.registerPushNotificationToken({
            handle: "handleLongerThan10Characters",
            platform: "dummy",
            appId: "appId",
            environment: environment
        });

        expect(result).toBeSuccessful();
        expect(result.value.devicePushIdentifier).toMatch(/^DPI[a-zA-Z0-9]{17}$/);
    });

    test("unregister", async () => {
        const result = await sServices.transport.account.unregisterPushNotificationToken();

        expect(result).toBeSuccessful();
    });
});

describe("CheckIfIdentityIsDeleted", () => {
    test("check deletion of Identity that is not deleted", async () => {
        const result = await sServices.transport.account.checkIfIdentityIsDeleted();
        expect(result).toBeSuccessful();
        expect(result.value.isDeleted).toBe(false);
        expect(result.value.deletionDate).toBeUndefined();
    });

    test("check deletion of Identity that has IdentityDeletionProcess with expired grace period", async () => {
        const identityDeletionProcess = await sServices.transport.identityDeletionProcesses.initiateIdentityDeletionProcess({ lengthOfGracePeriodInDays: 0 });

        const result = await sServices.transport.account.checkIfIdentityIsDeleted();
        expect(result).toBeSuccessful();
        expect(result.value.isDeleted).toBe(true);
        expect(result.value.deletionDate).toBe(identityDeletionProcess.value.gracePeriodEndsAt!.toString());
    });
});
