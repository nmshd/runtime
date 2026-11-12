import { ILogger } from "@js-soft/logging-abstractions";
import { SynchronizedCollection } from "@nmshd/transport";
import { calculateJwkThumbprint, importJWK, jwtVerify, SignJWT } from "jose";
import { instance, mock } from "ts-mockito";
import { KeyStorage } from "../../../src/modules/openid4vc/local/KeyStorage";

// Public test vector with omitted leading zero bytes in legacy P-256 coordinates and scalar.
const normalized = {
    publicKey: {
        kty: "EC",
        crv: "P-256",
        x: "AFVDiUrz0A7X10Cr29dclrBod7eH219w7qeLkKjXwAo",
        y: "u0yFo9jqKe-q-iRAaRLdhNWxTcMr9lbvbGvVil2UP5I"
    },
    privateKey: {
        kty: "EC",
        crv: "P-256",
        x: "AFVDiUrz0A7X10Cr29dclrBod7eH219w7qeLkKjXwAo",
        y: "u0yFo9jqKe-q-iRAaRLdhNWxTcMr9lbvbGvVil2UP5I",
        d: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXs"
    }
};
const legacy = {
    publicKey: {
        kty: "EC",
        crv: "P-256",
        x: "VUOJSvPQDtfXQKvb11yWsGh3t4fbX3Dup4uQqNfACg",
        y: "u0yFo9jqKe-q-iRAaRLdhNWxTcMr9lbvbGvVil2UP5I"
    },
    privateKey: {
        kty: "EC",
        crv: "P-256",
        x: "VUOJSvPQDtfXQKvb11yWsGh3t4fbX3Dup4uQqNfACg",
        y: "u0yFo9jqKe-q-iRAaRLdhNWxTcMr9lbvbGvVil2UP5I",
        d: "AXs"
    }
};

function storage(records: unknown[]) {
    const collection = Object.assign(instance(mock<SynchronizedCollection>()), {
        read: () => Promise.resolve(undefined),
        find: () => Promise.resolve(records)
    });
    return new KeyStorage(collection, instance(mock<ILogger>()));
}

test.each([
    { name: "normalized", publicKey: normalized.publicKey },
    { name: "legacy", publicKey: legacy.publicKey }
])("recovers a usable legacy key by its $name thumbprint", async ({ publicKey }) => {
    // Arrange
    const keys = storage([{ id: "legacy-uuid", key: JSON.stringify(legacy) }]);
    const id = await calculateJwkThumbprint(publicKey);

    // Act
    const result = await keys.getKey(id);

    // Assert
    expect(result).toEqual(normalized);
    const jwt = await new SignJWT({ nonce: "test" }).setProtectedHeader({ alg: "ES256" }).sign(await importJWK(result!.privateKey, "ES256"));
    await expect(jwtVerify(jwt, await importJWK(normalized.publicKey, "ES256"))).resolves.toMatchObject({ payload: { nonce: "test" } });
});

test("skips an unrelated malformed legacy record", async () => {
    // Arrange
    const keys = storage([
        { id: "broken", key: "not-json" },
        { id: "legacy-uuid", key: JSON.stringify(legacy) }
    ]);
    const id = await calculateJwkThumbprint(normalized.publicKey);

    // Act
    const result = await keys.getKey(id);

    // Assert
    expect(result).toEqual(normalized);
});

test("does not return a legacy key with an oversized P-256 coordinate", async () => {
    // Arrange
    const invalid = { ...legacy, publicKey: { ...legacy.publicKey, x: Buffer.alloc(33).toString("base64url") } };
    const keys = storage([{ id: "legacy-uuid", key: JSON.stringify(invalid) }]);
    const id = await calculateJwkThumbprint(normalized.publicKey);

    // Act
    const result = await keys.getKey(id);

    // Assert
    expect(result).toBeUndefined();
});
