import { ParsingError } from "@js-soft/ts-serval";
import { EMailAddress } from "../../src";

describe("creation of RepositoryAttributes of Attribute Value Type EMailAddress", function () {
    test("can create a RepositoryAttribute of Attribute Value Type EMailAddress", function () {
        const validEMailAdress = EMailAddress.from({
            value: "peter123@inwind.it"
        });
        expect(validEMailAdress.value.toString()).toBe("peter123@inwind.it");
    });
    test("can create a RepositoryAttribute of Attribute Value Type EMailAddress with the German 'ä' in its domain", function () {
        const validEMailAdress = EMailAddress.from({
            value: "peter123@inwänd.it"
        });
        expect(validEMailAdress.value.toString()).toBe("peter123@inwänd.it");
    });
    test("returns an error when trying to create an Attribute Value Type EMailAddress with a blank in the value for EMailAddress", function () {
        const invalidEMailAdressCall = () => {
            EMailAddress.from({
                value: "Hugo Becker@gmx.de"
            });
        };
        expect(invalidEMailAdressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][a-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[a-z0-9ÄäÖöÜüß](?:[a-zÄäÖöÜüß0-9-]{0,61}[a-zÄäÖöÜüß0-9]){0,1}[.])+[a-zÄäÖöÜüß0-9](?:[a-zÄäÖöÜüß0-9-]{0,61}[a-zÄäÖöÜüß0-9])$/i"
            )
        );
    });
    test("returns an error when trying to create an Attribute Value Type EMailAddress without the right ending in the value for EMailAddress", function () {
        const invalidEMailAdressCall = () => {
            EMailAddress.from({
                value: "Becker@gmx"
            });
        };
        expect(invalidEMailAdressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][a-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[a-z0-9ÄäÖöÜüß](?:[a-zÄäÖöÜüß0-9-]{0,61}[a-zÄäÖöÜüß0-9]){0,1}[.])+[a-zÄäÖöÜüß0-9](?:[a-zÄäÖöÜüß0-9-]{0,61}[a-zÄäÖöÜüß0-9])$/i"
            )
        );
    });
    test("returns an error when trying to create an Attribute Value Type EMailAddress with a - before the . in the value for EMailAddress", function () {
        const invalidEMailAdressCall = () => {
            EMailAddress.from({
                value: "Becker@gmx-.de"
            });
        };
        expect(invalidEMailAdressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][a-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[a-z0-9ÄäÖöÜüß](?:[a-zÄäÖöÜüß0-9-]{0,61}[a-zÄäÖöÜüß0-9]){0,1}[.])+[a-zÄäÖöÜüß0-9](?:[a-zÄäÖöÜüß0-9-]{0,61}[a-zÄäÖöÜüß0-9])$/i"
            )
        );
    });
});
