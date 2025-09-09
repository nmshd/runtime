import { CoreBuffer, CryptoEncryptionAlgorithm, CryptoSecretKey, SodiumWrapper } from "@nmshd/crypto";
import { CoreId, Reference, SharedPasswordProtection } from "../../src";

describe("Reference", () => {
    beforeAll(async () => await SodiumWrapper.ready());

    test("toUrl", () => {
        const reference = Reference.from({
            id: CoreId.from("ANID1234"),
            backboneBaseUrl: "https://backbone.example.com",
            key: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            })
        });

        expect(reference.toUrl()).toBe("https://backbone.example.com/r/ANID1234#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfHw");
    });

    test("toUrl with custom appId", () => {
        const reference = Reference.from({
            id: CoreId.from("ANID1234"),
            backboneBaseUrl: "https://backbone.example.com",
            key: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            })
        });

        expect(reference.toUrl("anAppName")).toBe("https://backbone.example.com/r/ANID1234?app=anAppName#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfHw");
    });

    test("toUrl with all reference fields used", () => {
        const reference = Reference.from({
            id: CoreId.from("ANID1234"),
            backboneBaseUrl: "https://backbone.example.com",
            key: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            forIdentityTruncated: "1234",
            passwordProtection: SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.fromUtf8("a16byteslongsalt")
            })
        });

        expect(reference.toUrl("anAppName")).toBe(
            "https://backbone.example.com/r/ANID1234?app=anAppName#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfDEyMzR8cHcmWVRFMllubDBaWE5zYjI1bmMyRnNkQT09"
        );
    });

    test("toUrl with a cleartext password in the passwordProtection reference fields used", () => {
        const reference = Reference.from({
            id: CoreId.from("ANID1234"),
            backboneBaseUrl: "https://backbone.example.com",
            key: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            passwordProtection: SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.fromUtf8("a16byteslongsalt"),
                password: "aPassword"
            })
        });

        expect(reference.toUrl()).toBe(
            "https://backbone.example.com/r/ANID1234#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfHxwdyZZVEUyWW5sMFpYTnNiMjVuYzJGc2RBPT0mJmFQYXNzd29yZA"
        );
    });

    test("from with a url reference", () => {
        const reference = Reference.from("https://backbone.example.com/r/ANID1234#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfHw");

        expect(reference).toBeInstanceOf(Reference);

        expect(reference.id.toString()).toBe("ANID1234");
        expect(reference.backboneBaseUrl).toBe("https://backbone.example.com");
        expect(reference.key.algorithm).toBe(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305);
        expect(reference.key.secretKey.toBase64URL()).toBe("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y");
        expect(reference.forIdentityTruncated).toBeUndefined();
        expect(reference.passwordProtection).toBeUndefined();
    });

    test("from with a url reference with all fields used", () => {
        const reference = Reference.from(
            "https://backbone.example.com/r/ANID1234?app=anAppName#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfDEyMzR8cHcmWVRFMllubDBaWE5zYjI1bmMyRnNkQT09"
        );

        expect(reference).toBeInstanceOf(Reference);

        expect(reference.id.toString()).toBe("ANID1234");
        expect(reference.backboneBaseUrl).toBe("https://backbone.example.com");
        expect(reference.key.algorithm).toBe(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305);
        expect(reference.key.secretKey.toBase64URL()).toBe("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y");
        expect(reference.forIdentityTruncated).toBe("1234");
        expect(reference.passwordProtection).toBeInstanceOf(SharedPasswordProtection);
        expect(reference.passwordProtection!.passwordType).toBe("pw");
        expect(reference.passwordProtection!.salt.toUtf8()).toBe("a16byteslongsalt");
    });

    test("from with a url reference with multiple /r/", () => {
        const reference = Reference.from("https://backbone.example.com/r/anotherPathSegment/r/r/ANID1234#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfHw");

        expect(reference).toBeInstanceOf(Reference);

        expect(reference.backboneBaseUrl).toBe("https://backbone.example.com/r/anotherPathSegment/r");
    });

    test.each([
        "https://backbone.example.com/r/ANID1234?app=anAppName#M3xsZXJKeVg4eWRKREVYb3dxMlBNTW50UlhYQTI3d2dISllBX0JqbkZ4NTVZfHw",
        "QU5JRDEyMzRAaHR0cHM6Ly9iYWNrYm9uZS5leGFtcGxlLmNvbXwzfGxlckp5WDh5ZEpERVhvd3EyUE1NbnRSWFhBMjd3Z0hKWUFfQmpuRng1NVl8fA"
    ])("Reference#from called with %s", (value) => {
        const reference = Reference.from(value);

        expect(reference).toBeInstanceOf(Reference);
        expect(reference.id.toString()).toBe("ANID1234");
        expect(reference.backboneBaseUrl).toBe("https://backbone.example.com");
    });
});
