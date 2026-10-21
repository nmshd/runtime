import { OpenId4VcCredentialFormat, OpenId4VciCredentialResponseJSON } from "@nmshd/content";
import { CoreSynchronizable, SynchronizedCollection } from "@nmshd/transport";
import { instance, mock } from "ts-mockito";
import { z } from "zod";
import { RequestedCredentialCache } from "../../../src/modules/openid4vc/local/RequestedCredentialCache";

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("preserves cached %s responses after serialization", async (format) => {
    const records: Record<string, unknown>[] = [];
    const collection = Object.assign(instance(mock<SynchronizedCollection>()), {
        create: (entry: CoreSynchronizable) => Promise.resolve(records.push(z.record(z.string(), z.unknown()).parse(JSON.parse(JSON.stringify(entry))))),
        findOne: ({ credentialOfferUrl }: { credentialOfferUrl: string }) => Promise.resolve(records.find((entry) => entry.credentialOfferUrl === credentialOfferUrl))
    });
    const cache = new RequestedCredentialCache(collection);
    const responses: OpenId4VciCredentialResponseJSON[] = [{ claimFormat: format, encoded: "credential", displayInformation: [{ name: "Test credential" }] }];
    await cache.set("https://issuer.example/offer", responses);

    const restored = await new RequestedCredentialCache(collection).get("https://issuer.example/offer");

    expect(restored).toStrictEqual(responses);
    await expect(cache.get("https://issuer.example/unknown")).resolves.toBeUndefined();
});

test.each([
    { credentialResponses: [{ claimFormat: "unsupported", encoded: "credential" }] },
    { credentialResponses: [{ claimFormat: "dc+sd-jwt", encoded: 42 }] },
    { credentialResponses: [{ claimFormat: "dc+sd-jwt", encoded: "credential", displayInformation: [{ logo: { uri: 42 } }] }] }
])("rejects malformed cached credential responses: %j", async ({ credentialResponses }) => {
    const collection = Object.assign(instance(mock<SynchronizedCollection>()), {
        findOne: () => Promise.resolve({ id: "REQ00000000000000001", credentialOfferUrl: "https://issuer.example/offer", credentialResponses })
    });

    await expect(new RequestedCredentialCache(collection).get("https://issuer.example/offer")).rejects.toThrow(z.ZodError);
});
