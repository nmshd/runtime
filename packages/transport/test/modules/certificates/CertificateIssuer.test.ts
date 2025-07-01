import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Certificate, CertificatePublicAttributeItem, CertificateTimeConstraint, ICertificateContent, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("CertificateIssuer", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let issuer: AccountController;
    let subject: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        issuer = accounts[0];
        subject = accounts[1];
    });

    afterAll(async () => {
        await connection.close();
    });

    describe("IssueCertificate", function () {
        test("should return with an Certificate object", async function () {
            const content: ICertificateContent = {
                issuedAt: CoreDate.utc(),
                issuer: issuer.identity.address,
                subject: subject.identity.address,
                subjectPublicKey: subject.identity.publicKey,
                issuerData: {
                    id: "abc"
                },
                constraints: [
                    CertificateTimeConstraint.from({
                        validFrom: CoreDate.utc(),
                        validTo: CoreDate.utc().add({ years: 2 })
                    })
                ],
                items: [
                    CertificatePublicAttributeItem.from({
                        name: "Person.givenName",
                        value: "aGivenName"
                    }),
                    CertificatePublicAttributeItem.from({
                        name: "Person.familyName",
                        value: "aFamilyName"
                    }),
                    CertificatePublicAttributeItem.from({
                        name: "Person.birthDate",
                        value: "16.12.1982"
                    })
                ]
            };
            const cert = await issuer.certificateIssuer.issueCertificate(content);

            expect(cert).toBeInstanceOf(Certificate);
            const serializedCert: string = cert.serialize();

            const valid = await cert.verify(issuer.identity.publicKey);
            expect(valid).toBe(true);

            const cert2 = Certificate.deserialize(serializedCert);
            const valid2 = await cert2.verify(issuer.identity.publicKey);
            expect(valid2).toBe(true);
        });
    });
});
