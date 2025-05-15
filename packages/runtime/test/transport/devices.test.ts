import { LanguageISO639 } from "@nmshd/core-types";
import { DeviceMapper, TransportServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    transportServices1 = runtimeServices[0].transport;
}, 30000);
afterAll(async () => await serviceProvider.stop());

describe("Devices", () => {
    test("should map the DeviceOnboardingInfoDTO to a DeviceSharedSecret", async () => {
        const createDeviceResult = await transportServices1.devices.createDevice({});
        const onboardingInfo = (await transportServices1.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id })).value;
        expect(onboardingInfo).toBeDefined();

        const sharedSecret = DeviceMapper.toDeviceSharedSecret(onboardingInfo);
        expect(sharedSecret).toBeDefined();
    });

    test("should set the communication language", async () => {
        const result = await transportServices1.devices.setCommunicationLanguage({ communicationLanguage: LanguageISO639.fr });
        expect(result).toBeSuccessful();
    });

    test("should not set the communication language with an invalid language", async () => {
        const result = await transportServices1.devices.setCommunicationLanguage({ communicationLanguage: "fra" as any as LanguageISO639 });
        expect(result).toBeAnError("communicationLanguage must be equal to one of the allowed values", "error.runtime.validation.invalidPropertyValue");
    });
});
