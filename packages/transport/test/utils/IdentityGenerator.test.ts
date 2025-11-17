import { CoreBuffer, CryptoSignatureKeypair, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreCrypto, IdentityUtil } from "@nmshd/transport";

describe("IdentityGeneratorTest", function () {
    describe("From", function () {
        let kp: CryptoSignatureKeypair;
        beforeAll(async function () {
            kp = await CoreCrypto.generateSignatureKeypair();
        });

        test("should create a correct address object", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            expect(address).toBeDefined();
            expect(address.address).toBeDefined();
            expect(address.address.startsWith("did:e:example.com:dids:")).toBe(true);
        });

        test("should create a correct address object (test 0)", async function () {
            const key = "tB9KFp/YqHrom3m5qUuZsd6l30DkaNjN14SxRw7YZuI=";
            const buf = CoreBuffer.fromBase64(key);
            const pk = CryptoSignaturePublicKey.from({ publicKey: buf, algorithm: 3 });
            const address = await IdentityUtil.createAddress(pk, "example.com");
            expect(address).toBeDefined();
            expect(address.address).toBeDefined();
            expect(address.address).toBe("did:e:example.com:dids:56b3f2a0c202e27229aab6");
        });

        test("should create a correct address object (testcases)", async function () {
            const addresses = [
                {
                    backboneHostname: "example.com",
                    publicKey: "fj0o9eOiPRswTZL6j9lE9TRvpDDnPRMF0gJeahz/W2c=",
                    address: "did:e:example.com:dids:fef1992c5e529adc41328d"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "jRxGfZtQ8a90TmKCGk+dhuX1CBjgoXuldhNPwrjpWsw=",
                    address: "did:e:example.com:dids:b9d25bd0a2bbd3aa4843ed"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "PEODpwvi7KxIVa4qeUXia9apMFvPMktdDHiDitlfbjE=",
                    address: "did:e:example.com:dids:d459ff2144f0eac7aff5f7"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "mJGmNbxiVZAPToRuk9O3NvdfsWl6V+7wzIc+/57bU08=",
                    address: "did:e:example.com:dids:e2208784ee2769c5d9686a"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "l68K/zdNp1VLoswcHAqN6QUFwCMU6Yvzf7XiW2m1hRY=",
                    address: "did:e:example.com:dids:5845cf29fbda2897892a66"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "Gl8XTo8qFuUM+ksXixwp4g/jf3H/hU1F8ETuYaHCM5I=",
                    address: "did:e:example.com:dids:01f4bab09d757578bb49ac"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "rIS4kAzHXT7GgCA6Qm1ANlwM3x12QMSkeprHb6tjPyc=",
                    address: "did:e:example.com:dids:ee5966a158f1dc4de5bdc9"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "hg/cbeBvfNrMiJ0dW1AtWC4IQwG4gkuhzG2+z6bAoRU=",
                    address: "did:e:example.com:dids:ab7475ba4070f29ce2861c"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "kId+qWen/lKeTdyxcIQhkzvvvTU8wIJECfWUWbmRQRY=",
                    address: "did:e:example.com:dids:4664f42d7ca6480db07f18"
                },
                {
                    backboneHostname: "example.com",
                    publicKey: "NcqlzTEpSlKX9gmNBv41EjPRHpaNYwt0bxqh1bgyJzA=",
                    address: "did:e:example.com:dids:60326ff5075e0d73789973"
                }
            ];

            for (let i = 0; i < 10; i++) {
                const testcase = addresses[i];
                const buf = CoreBuffer.fromBase64(testcase.publicKey);
                const pk = CryptoSignaturePublicKey.from({ publicKey: buf, algorithm: 3 });
                const address = await IdentityUtil.createAddress(pk, testcase.backboneHostname);
                expect(address.toString()).toStrictEqual(testcase.address);
            }
        });

        test("should positively check a correct address object (without giving public key)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            const valid = await IdentityUtil.checkAddress(address, "example.com");
            expect(valid).toBe(true);
        });

        test("should positively check a correct address object (giving public key)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            const valid = await IdentityUtil.checkAddress(address, "example.com", kp.publicKey);
            expect(valid).toBe(true);
        });

        test("should positively check a correct address object (giving public key and backboneHostname)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            const valid = await IdentityUtil.checkAddress(address, "example.com", kp.publicKey);
            expect(valid).toBe(true);
        });

        test("should negatively check an incorrect address object (wrong backboneHostname)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            const valid = await IdentityUtil.checkAddress(address, "dev.enmeshed.eu", kp.publicKey);
            expect(valid).toBe(false);
        });

        test("should negatively check an incorrect address object (wrong checksum)", async function () {
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            const index = 32;
            let replaceWith = "b";
            const currentString = address.address.substr(index, replaceWith.length);
            if (currentString === replaceWith) {
                replaceWith = "c";
            }
            const wrongaddress = address.address.substr(0, index) + replaceWith + address.address.substr(index + replaceWith.length);
            address.address = wrongaddress;
            const valid = await IdentityUtil.checkAddress(address, "example.com", kp.publicKey);
            expect(valid).toBe(false);
        });

        test("should negatively check an incorrect address object (wrong publicKey)", async function () {
            const kp2 = await CoreCrypto.generateSignatureKeypair();
            const address = await IdentityUtil.createAddress(kp.publicKey, "example.com");
            const valid = await IdentityUtil.checkAddress(address, "example.com", kp2.publicKey);
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
