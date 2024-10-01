import { TokenDTO, TransportServices } from "../../src";
import { NoLoginTestRuntime, RuntimeServiceProvider, TestRuntime, TestRuntimeServices, uploadOwnToken } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices: TransportServices;
let noLoginRuntime: TestRuntime;
let runtimeService: TestRuntimeServices;

beforeAll(async () => {
    runtimeService = (await serviceProvider.launch(1))[0];
    transportServices = runtimeService.transport;

    noLoginRuntime = new NoLoginTestRuntime(RuntimeServiceProvider.defaultConfig);
    await noLoginRuntime.init();
    await noLoginRuntime.start();
}, 30000);
afterAll(async () => {
    await serviceProvider.stop();
    await noLoginRuntime.stop();
});

describe("Anonymous tokens", () => {
    let uploadedToken: TokenDTO;
    beforeAll(async () => {
        uploadedToken = await uploadOwnToken(transportServices);
    });

    test("should get the token anonymous by truncated reference", async () => {
        const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
            reference: uploadedToken.truncatedReference
        });
        expect(result).toBeSuccessful();

        const token = result.value;
        expect(token.content).toStrictEqual(uploadedToken.content);
    });
});
