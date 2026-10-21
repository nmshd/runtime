import { OpenId4VcCredentialFormat, OpenId4VciCredentialResponseJSON, TokenContentVerifiablePresentation, VerifiableCredential } from "../../src";

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("preserves %s credentials and display information in JSON", (format) => {
    const response: OpenId4VciCredentialResponseJSON = {
        claimFormat: format,
        encoded: "encoded-credential",
        displayInformation: [{ name: "Test credential", locale: "de", logo: { uri: "https://issuer.example/logo.png" } }],
        displayInformationCachedImages: [{ "@type": "DisplayInformationCachedImages", locale: "de", logo: "cached-logo" }]
    };
    const decoded: OpenId4VciCredentialResponseJSON = JSON.parse(JSON.stringify(response));
    expect(decoded).toStrictEqual(response);
    const content = VerifiableCredential.from({
        type: decoded.claimFormat,
        value: decoded.encoded,
        displayInformation: decoded.displayInformation,
        displayInformationCachedImages: decoded.displayInformationCachedImages
    });
    const restored = VerifiableCredential.from(JSON.parse(JSON.stringify(content)));
    expect(restored.toJSON()).toStrictEqual(content.toJSON());
    expect(restored.type).toBe(format);
    expect(restored.toJSON().displayInformation).toStrictEqual(response.displayInformation);
    expect(restored.displayInformation?.[0].name).toBe("Test credential");
    expect(restored.displayInformation?.[0].logo).toStrictEqual({ uri: "https://issuer.example/logo.png" });
    const token = TokenContentVerifiablePresentation.from({ type: format, value: "presentation", displayInformation: restored.displayInformation });
    const restoredToken = TokenContentVerifiablePresentation.from(JSON.parse(JSON.stringify(token)));
    expect(restoredToken.displayInformation?.[0].name).toBe("Test credential");
    expect(restoredToken.toJSON().displayInformation).toStrictEqual(response.displayInformation);
});
