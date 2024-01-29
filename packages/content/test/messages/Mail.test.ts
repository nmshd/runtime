import { Serializable } from "@js-soft/ts-serval";
import { Mail } from "../../src";

describe("Mail", function () {
    test("should create a Mail from JSON", function () {
        const mail = Serializable.fromUnknown({
            "@type": "Mail",
            to: ["id1PNvUP4jHD74qo6usnWNoaFGFf33MXZi6c"],
            cc: [],
            subject: "A Subject",
            body: "A Body"
        });

        expect(mail).toBeInstanceOf(Mail);
    });

    test("should create a Mail from JSON if cc is missing", function () {
        const mail = Serializable.fromUnknown({
            "@type": "Mail",
            to: ["id1PNvUP4jHD74qo6usnWNoaFGFf33MXZi6c"],
            subject: "A Subject",
            body: "A Body"
        });

        expect(mail).toBeInstanceOf(Mail);
    });

    test("should throw an Error if to is empty", function () {
        let error: any;

        try {
            Serializable.fromUnknown({
                "@type": "Mail",
                to: [],
                cc: [],
                subject: "A Subject",
                body: "A Body"
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
                subject: "A Subject",
                body: "A Body"
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toBe("Mail.to :: Value is not defined");
    });
});
