import { CoreBuffer, CryptoSignatureAlgorithm, CryptoSignatureKeypair, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreCrypto, IdentityUtil } from "../../src";

describe("IdentityGeneratorTest", function () {
    describe("From", function () {
        let kp: CryptoSignatureKeypair;
        beforeAll(async function () {
            kp = await CoreCrypto.generateSignatureKeypair();
        });

        test("should create a correct address object", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            expect(address).toBeDefined();
            expect(address.address).toBeDefined();
            expect(address.address.substr(0, 3)).toBe("id1");
        });

        test("should create a correct address object (test 0)", async function () {
            const key = "tB9KFp/YqHrom3m5qUuZsd6l30DkaNjN14SxRw7YZuI=";
            const buf = CoreBuffer.fromBase64(key);
            const pk = CryptoSignaturePublicKey.from({
                publicKey: buf,
                algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519
            });
            const address = await IdentityUtil.createAddress(pk, "id1");
            expect(address).toBeDefined();
            expect(address.address).toBeDefined();
            expect(address.address).toBe("id18uSgVGTSNqECvt1DJM3bZg6U8p6RSjott");
        });

        test("should create a correct address object (testcases)", async function () {
            const addresses = [
                {
                    realm: "id1",
                    publicKey: "fj0o9eOiPRswTZL6j9lE9TRvpDDnPRMF0gJeahz/W2c=",
                    address: "id1QF24Gk2DfqCywRS7NpeH5iu7D4xvu6qv1"
                },
                {
                    realm: "id1",
                    publicKey: "jRxGfZtQ8a90TmKCGk+dhuX1CBjgoXuldhNPwrjpWsw=",
                    address: "id1HwY1TuyVBp3CmY3h18yTt1CKyu5qwB9wj"
                },
                {
                    realm: "id1",
                    publicKey: "PEODpwvi7KxIVa4qeUXia9apMFvPMktdDHiDitlfbjE=",
                    address: "id1LMp4k1XwxZ3WFXdAn9y12tv1ofe5so4kM"
                },
                {
                    realm: "id1",
                    publicKey: "mJGmNbxiVZAPToRuk9O3NvdfsWl6V+7wzIc+/57bU08=",
                    address: "id1McegXycvRoiJppS2LG25phn3jNveckFUL"
                },
                {
                    realm: "id1",
                    publicKey: "l68K/zdNp1VLoswcHAqN6QUFwCMU6Yvzf7XiW2m1hRY=",
                    address: "id193k6K5cJr94WJEWYb6Kei8zp5CGPyrQLS"
                },
                {
                    realm: "id1",
                    publicKey: "Gl8XTo8qFuUM+ksXixwp4g/jf3H/hU1F8ETuYaHCM5I=",
                    address: "id1BLrHAgDpimtLcGJGssMSm7bJHsvVe7CN"
                },
                {
                    realm: "id1",
                    publicKey: "rIS4kAzHXT7GgCA6Qm1ANlwM3x12QMSkeprHb6tjPyc=",
                    address: "id1NjGvLfWPrQ34PXWRBNiTfXv9DFiDQHExx"
                },
                {
                    realm: "id1",
                    publicKey: "hg/cbeBvfNrMiJ0dW1AtWC4IQwG4gkuhzG2+z6bAoRU=",
                    address: "id1Gda4aTXiBX9Pyc8UnmLaG44cX46umjnea"
                },
                {
                    realm: "id1",
                    publicKey: "kId+qWen/lKeTdyxcIQhkzvvvTU8wIJECfWUWbmRQRY=",
                    address: "id17RDEphijMPFGLbhqLWWgJfatBANMruC8f"
                },
                {
                    realm: "id1",
                    publicKey: "NcqlzTEpSlKX9gmNBv41EjPRHpaNYwt0bxqh1bgyJzA=",
                    address: "id19meHs4Di7JYNXoRPx9bFD6FUcpHFo3mBi"
                }
            ];

            for (let i = 0; i < 10; i++) {
                const testcase = addresses[i];
                const buf = CoreBuffer.fromBase64(testcase.publicKey);
                const pk = CryptoSignaturePublicKey.from({
                    publicKey: buf,
                    algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519
                });
                const address = await IdentityUtil.createAddress(pk, testcase.realm);
                expect(address.toString()).toStrictEqual(testcase.address);
            }
        });

        test("should positively check a correct address object (without giving public key and realm)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            const valid = await IdentityUtil.checkAddress(address);
            expect(valid).toBe(true);
        });

        test("should positively check a correct address object (giving public key)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            const valid = await IdentityUtil.checkAddress(address, kp.publicKey);
            expect(valid).toBe(true);
        });

        test("should positively check a correct address object (giving public key and realm)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            const valid = await IdentityUtil.checkAddress(address, kp.publicKey, "id1");
            expect(valid).toBe(true);
        });

        test("should negatively check an incorrect address object (wrong realm)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            const valid = await IdentityUtil.checkAddress(address, kp.publicKey, "id2");
            expect(valid).toBe(false);
        });

        test("should negatively check an incorrect address object (wrong checksum)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            const index = 5;
            let replaceWith = "b";
            const currentString = address.address.substr(index, replaceWith.length);
            if (currentString === replaceWith) {
                replaceWith = "c";
            }
            const wrongaddress = address.address.substr(0, index) + replaceWith + address.address.substr(index + replaceWith.length);
            address.address = wrongaddress;
            const valid = await IdentityUtil.checkAddress(address, kp.publicKey, "id1");
            expect(valid).toBe(false);
        });

        test("should negatively check an incorrect address object (wrong publicKey)", async function () {
            const kp2 = await CoreCrypto.generateSignatureKeypair();
            const address = await IdentityUtil.createAddress(kp.publicKey, "id1");
            const valid = await IdentityUtil.checkAddress(address, kp2.publicKey, "id1");
            expect(valid).toBe(false);
        });
        // eslint-disable-next-line jest/no-commented-out-tests
        /*
                it("should serialize as a String and valid JSON", async function() {
                    const i:OwnIdentity = await IdentityUtil.createIdentity("Test");
                    const s:string = await i.serialize();
                    expect(typeof s).toBe("string");
                    const o:unknown = JSON.parse(s);
                });

                it("should incorporate all the properties", async function() {
                    const i:OwnIdentity = await IdentityUtil.createIdentity("Test");
                    const s:string = await i.serialize();

                    expect(typeof s).toBe("string");
                    const o:IOwnIdentity = JSON.parse(s) as IOwnIdentity;
                    expect(o.publicIdentity.version).toBeDefined();
                    expect(typeof o.publicIdentity.version).toBe("string");

                    expect(o.publicIdentity.address).toBeDefined();
                    expect(typeof o.publicIdentity.address).toBe("string");

                    expect(o.publicIdentity.addressChecksum).toBeDefined();
                    expect(typeof o.publicIdentity.addressChecksum).toBe("string");

                    expect(o.publicIdentity.did).toBeDefined();
                    expect(typeof o.publicIdentity.did).toBe("string");

                    expect(o.createdAt).toBeDefined();
                    expect(typeof o.createdAt).toBe("string");

                    expect(o.publicIdentity.exchange).toBeDefined();
                    expect(o.publicIdentity.exchange).to.be.an("object");

                    expect(o.exchangeKeypair).toBeDefined();
                    expect(o.exchangeKeypair).to.be.an("object");
                    expect(o.exchangeKeypair.privateKey).toBeDefined();
                    expect(o.exchangeKeypair.publicKey).toBeDefined();

                    expect(o.publicIdentity.signing).toBeDefined();
                    expect(o.publicIdentity.signing).to.be.an("object");

                    expect(o.signingKeypair).toBeDefined();
                    expect(o.signingKeypair).to.be.an("object");
                    expect(o.signingKeypair.privateKey).toBeDefined();
                    expect(o.signingKeypair.publicKey).toBeDefined();

                    expect(o.name).toBeDefined();
                    expect(typeof o.name).toBe("string");
                });

                it("should deserialize correctly", async function() {
                    const i:OwnIdentity = await IdentityUtil.createIdentity("Test");
                    const s:string = await i.serialize();

                    expect(typeof s).toBe("string");
                    const o:IOwnIdentity = await OwnIdentity.deserialize(s);
                    expect(o.publicIdentity.version).toBeDefined();
                    expect(typeof o.publicIdentity.version).toBe("string");

                    expect(o.publicIdentity.address).toBeDefined();
                    expect(o.publicIdentity.address).toBeInstanceOf(Address);

                    expect(o.publicIdentity.addressChecksum).toBeDefined();
                    expect(typeof o.publicIdentity.addressChecksum).toBe("string");

                    expect(o.publicIdentity.did).toBeDefined();
                    expect(typeof o.publicIdentity.did).toBe("string");

                    expect(o.createdAt).toBeDefined();
                    expect(o.createdAt).toBeInstanceOf(Date);
                    expect(o.createdAt.dateObj).toBeInstanceOf(Date);
                    expect(typeof o.createdAt.date).toBe("string");
                    expect(o.createdAt.dateObj.getTime()).toBeGreaterThan(100000);

                    expect(o.publicIdentity.exchange).toBeDefined();
                    expect(o.publicIdentity.exchange).toBeInstanceOf(CryptoPublicKey);

                    expect(o.exchangeKeypair).toBeDefined();
                    expect(o.exchangeKeypair).toBeInstanceOf(CryptoKeypair);
                    expect(o.exchangeKeypair.privateKey).toBeDefined();
                    expect(o.exchangeKeypair.publicKey).toBeDefined();

                    expect(o.publicIdentity.signing).toBeDefined();
                    expect(o.publicIdentity.signing).toBeInstanceOf(CryptoPublicKey);

                    expect(o.signingKeypair).toBeDefined();
                    expect(o.signingKeypair).toBeInstanceOf(CryptoKeypair);
                    expect(o.signingKeypair.privateKey).toBeDefined();
                    expect(o.signingKeypair.publicKey).toBeDefined();

                    expect(o.name).toBeDefined();
                    expect(typeof o.name).toBe("string");
                });
                */
    });
});
