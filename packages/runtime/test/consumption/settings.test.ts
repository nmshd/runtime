import { ConsumptionIds } from "@nmshd/consumption";
import { CoreDate } from "@nmshd/core-types";
import { ConsumptionServices, GetSettingsQuery } from "@nmshd/runtime";
import { TransportIds } from "@nmshd/transport";
import { QueryParamConditions, RuntimeServiceProvider } from "../lib/index.js";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

afterEach(async () => {
    const settings = await consumptionServices.settings.getSettings({});
    for (const setting of settings.value) {
        await consumptionServices.settings.deleteSetting({ id: setting.id });
    }
});

describe("Settings", () => {
    test("should create a setting", async () => {
        const value = { aKey: "a-value" };
        const result = await consumptionServices.settings.createSetting({ key: "a-key", value: value });
        expect(result).toBeSuccessful();
    });

    test("should get the setting", async () => {
        const value = { aKey: "a-value" };
        const createSettingResult = await consumptionServices.settings.createSetting({ key: "a-key", value: value });

        const result = await consumptionServices.settings.getSetting({ id: createSettingResult.value.id });
        expect(result).toBeSuccessful();

        const setting = result.value;

        expect(setting.value).toStrictEqual(value);
    });

    test("should contain the setting in the list of settings", async () => {
        const value = { aKey: "a-value" };
        const settingId = (await consumptionServices.settings.createSetting({ key: "a-key", value: value })).value.id;

        const result = await consumptionServices.settings.getSettings({});
        expect(result).toBeSuccessful();

        const settings = result.value;

        expect(settings).toHaveLength(1);
        expect(settings[0].id).toStrictEqual(settingId);
        expect(settings[0].value).toStrictEqual(value);
    });

    test("should edit the setting", async () => {
        const value = { aKey: "a-value" };
        const settingId = (await consumptionServices.settings.createSetting({ key: "a-key", value: value })).value.id;

        const newValue = { aKey: "another-Value" };
        const updateResult = await consumptionServices.settings.updateSetting({
            id: settingId,
            value: newValue
        });
        expect(updateResult).toBeSuccessful();

        const result = await consumptionServices.settings.getSetting({ id: settingId });
        expect(result).toBeSuccessful();

        const setting = result.value;
        expect(setting.value).toStrictEqual(newValue);
    });

    test("should delete the setting", async () => {
        const value = { aKey: "a-value" };
        const settingId = (await consumptionServices.settings.createSetting({ key: "a-key", value: value })).value.id;

        const deleteResult = await consumptionServices.settings.deleteSetting({ id: settingId });
        expect(deleteResult).toBeSuccessful();

        const result = await consumptionServices.settings.getSettings({});
        expect(result).toBeSuccessful();

        const settings = result.value;
        expect(settings).toHaveLength(0);
    });

    test("should get the setting by key", async () => {
        const value = { aKey: "a-value" };
        const toBeSucceeded = await consumptionServices.settings.createSetting({ key: "a-key", value });

        await consumptionServices.settings.createSetting({
            key: "a-key",
            value: { key: ["newValue"] },
            succeedsItem: toBeSucceeded.value.id,
            succeedsAt: CoreDate.utc().toString()
        });

        const result = await consumptionServices.settings.getSettingByKey({ key: "a-key" });
        expect(result).toBeSuccessful();

        const setting = result.value;
        expect(setting.value).toStrictEqual({ key: ["newValue"] });
    });

    test("should upsert a setting by key when it does not exist yet", async () => {
        await consumptionServices.settings.upsertSettingByKey({
            key: "a-key",
            value: { aKey: "a-value" }
        });

        const result = await consumptionServices.settings.getSettings({});
        expect(result).toBeSuccessful();
        expect(result.value).toHaveLength(1);

        const setting = await consumptionServices.settings.getSettingByKey({ key: "a-key" });
        expect(setting.value.value).toStrictEqual({ aKey: "a-value" });
    });

    test("should upsert a setting by key", async () => {
        const value = { aKey: "a-value" };
        await consumptionServices.settings.createSetting({ key: "a-key", value });

        await consumptionServices.settings.upsertSettingByKey({
            key: "a-key",
            value: { aKey: "aNewValue" }
        });

        const result = await consumptionServices.settings.getSettings({});
        expect(result).toBeSuccessful();
        expect(result.value).toHaveLength(1);

        const setting = await consumptionServices.settings.getSettingByKey({ key: "a-key" });
        expect(setting.value.value).toStrictEqual({ aKey: "aNewValue" });
    });

    test("should get the settings by key including a reference and type", async () => {
        const key = "a-key";
        const value = { aKey: "a-value" };
        const reference = (await TransportIds.generic.generate()).toString();
        const scope = "Identity";

        const upsertSettingResult = await consumptionServices.settings.upsertSettingByKey({ key, reference, scope, value });
        expect(upsertSettingResult).toBeSuccessful();

        const result = await consumptionServices.settings.getSettingByKey({ key, reference, scope });
        expect(result).toBeSuccessful();
        expect(result.value.value).toStrictEqual(value);
    });
});

describe("Settings query", () => {
    test("settings can be queried by their attributes", async () => {
        const result = await consumptionServices.settings.createSetting({
            key: "a-key",
            value: {},

            reference: (await TransportIds.generic.generate()).toString(),
            scope: "Device",
            succeedsItem: (await ConsumptionIds.setting.generate()).toString(),
            succeedsAt: CoreDate.utc().toString()
        });
        expect(result).toBeSuccessful();

        const setting = result.value;

        const conditions = new QueryParamConditions<GetSettingsQuery, ConsumptionServices>(setting, consumptionServices)
            .addStringSet("key")
            .addStringSet("scope")
            .addStringSet("reference")
            .addDateSet("createdAt")
            .addStringSet("succeedsItem")
            .addDateSet("succeedsAt");

        await conditions.executeTests((c, q) => c.settings.getSettings({ query: q }));
    });
});
