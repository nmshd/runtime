import { TokenDTO } from "../../src";
import { NoLoginTestRuntime, RuntimeServiceProvider, TestRuntime, TestRuntimeServices, uploadOwnToken } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let noLoginRuntime: TestRuntime;
let runtimeService: TestRuntimeServices;

beforeAll(async () => {
    runtimeService = (await serviceProvider.launch(1))[0];

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
        uploadedToken = await uploadOwnToken(runtimeService.transport);
    });

    test("should get the token anonymous by truncated reference", async () => {
        const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
            reference: uploadedToken.truncatedReference
        });
        expect(result).toBeSuccessful();

        const token = result.value;
        expect(token.content).toStrictEqual(uploadedToken.content);
    });

    test("should catch a personalized token", async () => {
        const uploadedPersonalizedToken = await uploadOwnToken(runtimeService.transport, runtimeService.address);
        const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
            reference: uploadedPersonalizedToken.truncatedReference
        });
        expect(result).toBeAnError(/.*/, "error.transport.general.notIntendedForYou");
    });
});
