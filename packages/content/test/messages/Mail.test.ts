import { Serializable } from "@js-soft/ts-serval";
import { Mail, MailBodyFormat } from "../../src";

describe("Mail", function () {
    test("should create a Mail from JSON", function () {
        const mail = Serializable.fromUnknown({
            "@type": "Mail",
            to: ["did:e:a-domain:dids:anidentity"],
            cc: [],
            subject: "aSubject",
            body: "aBody"
        });

        expect(mail).toBeInstanceOf(Mail);
    });

    test("should create a Mail from JSON if cc is missing", function () {
        const mail = Serializable.fromUnknown({
            "@type": "Mail",
            to: ["did:e:a-domain:dids:anidentity"],
            subject: "aSubject",
            body: "aBody"
        });

        expect(mail).toBeInstanceOf(Mail);
    });

    test("should create a Mail from JSON with defaulting body format to PlainText", function () {
        const mail = Serializable.fromUnknown({
            "@type": "Mail",
            to: ["did:e:a-domain:dids:anidentity"],
            cc: [],
            subject: "aSubject",
            body: "aBody"
        });

        expect(mail).toBeInstanceOf(Mail);
        expect((mail as Mail).bodyFormat).toBe(MailBodyFormat.PlainText);
    });

    test.each([MailBodyFormat.PlainText, MailBodyFormat.Markdown, "PlainText", "Markdown"] satisfies (MailBodyFormat | "PlainText" | "Markdown")[])(
        "should create a mail with different body formats",
        function (bodyFormat) {
            const mail = Mail.from({ to: ["did:e:a-domain:dids:anidentity"], cc: [], subject: "aSubject", body: "aBody", bodyFormat });
            expect(mail).toBeInstanceOf(Mail);
            expect(mail.bodyFormat).toBe(bodyFormat);
        }
    );

    test("should throw an Error if to is empty", function () {
        let error: any;

        try {
            Serializable.fromUnknown({
                "@type": "Mail",
                to: [],
                cc: [],
                subject: "aSubject",
                body: "aBody"
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toBe("Mail.to:Array :: may not be empty");
    });

    test("should throw an Error if to is missing", function () {
        let error: any;

        try {
            Serializable.fromUnknown({
                "@type": "Mail",
                cc: [],
                subject: "aSubject",
                body: "aBody"
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toBe("Mail.to :: Value is not defined");
    });

    test("should throw an Error if an invalid bodyFormat is passed", function () {
        let error: any;

        try {
            Serializable.fromUnknown({
                "@type": "Mail",
                to: ["did:e:a-domain:dids:anidentity"],
                cc: [],
                subject: "aSubject",
                body: "aBody",
                bodyFormat: "InvalidFormat"
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toBe("Mail.bodyFormat:String :: must be one of: PlainText,Markdown");
    });
});
