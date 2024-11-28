import { CoreDate } from "@nmshd/core-types";
import { DateTime } from "luxon";
import { DatawalletSynchronizedEvent, DeviceDTO, DeviceOnboardingInfoDTO, TransportServices } from "../../src";
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

describe("LoadItemFromTruncatedReference", () => {
    describe("File", () => {
        let fileReference: string;
        let fileTokenReference: string;
        let passwordProtectedFileTokenReference: string;

        beforeAll(async () => {
            const file = await uploadFile(sTransportServices);
            fileReference = file.truncatedReference;
            fileTokenReference = (await sTransportServices.files.createTokenForFile({ fileId: file.id })).value.truncatedReference;
            passwordProtectedFileTokenReference = (
                await sTransportServices.files.createTokenForFile({
                    fileId: file.id,
                    passwordProtection: { password: "password" }
                })
            ).value.truncatedReference;
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

        test("loads the File with the password-protected truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: passwordProtectedFileTokenReference, password: "password" });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("File");
        });

        test("doesn't load the File with the password-protected truncated Token reference if password is wrong", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: passwordProtectedFileTokenReference, password: "wrong-password" });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("doesn't load the File with the password-protected truncated Token reference if password is missing", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: passwordProtectedFileTokenReference });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });

    describe("RelationshipTemplate", () => {
        let relationshipTemplateReference: string;
        let relationshipTemplateTokenReference: string;
        let passwordProtectedRelationshipTemplateTokenReference: string;

        beforeAll(async () => {
            const relationshipTemplate = (
                await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate({
                    content: emptyRelationshipTemplateContent,
                    expiresAt: CoreDate.utc().add({ days: 1 }).toISOString()
                })
            ).value;
            relationshipTemplateReference = relationshipTemplate.truncatedReference;
            relationshipTemplateTokenReference = (await sTransportServices.relationshipTemplates.createTokenForOwnTemplate({ templateId: relationshipTemplate.id })).value
                .truncatedReference;
            passwordProtectedRelationshipTemplateTokenReference = (
                await sTransportServices.relationshipTemplates.createTokenForOwnTemplate({
                    templateId: relationshipTemplate.id,
                    passwordProtection: { password: "password" }
                })
            ).value.truncatedReference;
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

        test("loads the RelationshipTemplate with the password-protected truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({
                reference: passwordProtectedRelationshipTemplateTokenReference,
                password: "password"
            });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("doesn't load the RelationshipTemplate with the password-protected truncated Token reference if password is wrong", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({
                reference: passwordProtectedRelationshipTemplateTokenReference,
                password: "wrong-password"
            });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("doesn't load the RelationshipTemplate with the password-protected truncated Token reference if password is missing", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({
                reference: passwordProtectedRelationshipTemplateTokenReference
            });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });

    describe("Token", () => {
        let tokenReference: string;
        let passwordProtectedTokenReference: string;

        beforeAll(async () => {
            const token = (await sTransportServices.tokens.createOwnToken({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(), ephemeral: true })).value;
            tokenReference = token.truncatedReference;

            const passwordProtectedToken = (
                await sTransportServices.tokens.createOwnToken({
                    content: {},
                    expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
                    ephemeral: true,
                    passwordProtection: { password: "password" }
                })
            ).value;
            passwordProtectedTokenReference = passwordProtectedToken.truncatedReference;
        });

        test("loads the Token with the truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: tokenReference });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("Token");
        });

        test("loads the Token with the password-protected truncated Token reference", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: passwordProtectedTokenReference, password: "password" });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("Token");
        });

        test("doesn't load the Token with the password-protected truncated Token reference if password is wrong", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: passwordProtectedTokenReference, password: "wrong-password" });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("doesn't load the Token with the password-protected truncated Token reference if password is missing", async () => {
            const result = await rTransportServices.account.loadItemFromTruncatedReference({ reference: passwordProtectedTokenReference });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
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
