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
});
