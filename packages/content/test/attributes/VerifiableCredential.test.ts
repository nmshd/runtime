import { TokenContentVerifiablePresentation, VerifiableCredential, VerifiableCredentialJSON } from "../../src";

test.each(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("preserves %s credentials and display information in JSON", (format) => {
    const credential: VerifiableCredentialJSON = {
        "@type": "VerifiableCredential",
        type: format,
        value: "encoded-credential",
        displayInformation: [{ name: "Test credential", locale: "de", logo: { uri: "https://issuer.example/logo.png" } }],
        displayInformationCachedImages: [{ "@type": "DisplayInformationCachedImages", locale: "de", logo: "cached-logo" }]
    };
    const decoded: VerifiableCredentialJSON = JSON.parse(JSON.stringify(credential));

    expect(decoded).toStrictEqual(credential);

    const content = VerifiableCredential.from(decoded);
    const restored = VerifiableCredential.from(JSON.parse(JSON.stringify(content)));

    expect(restored.toJSON()).toStrictEqual(content.toJSON());
    expect(restored.type).toBe(format);
    expect(restored.toJSON().displayInformation).toStrictEqual(credential.displayInformation);
    expect(restored.displayInformation?.[0].name).toBe("Test credential");
    expect(restored.displayInformation?.[0].logo).toStrictEqual({ uri: "https://issuer.example/logo.png" });

    const token = TokenContentVerifiablePresentation.from({ type: format, value: "presentation", displayInformation: restored.displayInformation });
    const restoredToken = TokenContentVerifiablePresentation.from(JSON.parse(JSON.stringify(token)));

    expect(restoredToken.displayInformation?.[0].name).toBe("Test credential");
    expect(restoredToken.toJSON().displayInformation).toStrictEqual(credential.displayInformation);
});
