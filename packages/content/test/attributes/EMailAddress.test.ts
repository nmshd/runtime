import { ParsingError } from "@js-soft/ts-serval";
import { EMailAddress } from "../../src";

describe("creation of RepositoryAttributes of Attribute value type EMailAddress", function () {
    test("can create a RepositoryAttribute of Attribute value type EMailAddress", function () {
        const validEMailAddress = EMailAddress.from({
            value: "peter123@inwind.it"
        });
        expect(validEMailAddress.value.toString()).toBe("peter123@inwind.it");
    });
    test("can create a RepositoryAttribute of Attribute value type EMailAddress with the German 'ä' in its domain", function () {
        const validEMailAddress = EMailAddress.from({
            value: "peter123@inwänd.it"
        });
        expect(validEMailAddress.value.toString()).toBe("peter123@inwänd.it");
    });
    test("returns an error when trying to create an Attribute value type EMailAddress with a blank in the value for EMailAddress", function () {
        const invalidEMailAddressCall = () => {
            EMailAddress.from({
                value: "Hugo Becker@gmx.de"
            });
        };
        expect(invalidEMailAddressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])+[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute value type EMailAddress without the right ending in the value for EMailAddress", function () {
        const invalidEMailAddressCall = () => {
            EMailAddress.from({
                value: "Becker@gmx"
            });
        };
        expect(invalidEMailAddressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])+[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute value type EMailAddress with a domain which ends with a - because this is not allowed for domains.", function () {
        const invalidEMailAddressCall = () => {
            EMailAddress.from({
                value: "Becker@gmx-.de"
            });
        };
        expect(invalidEMailAddressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])+[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute value type EMailAddress with a domain which begins with a - because this is not allowed for domains.", function () {
        const invalidEMailAddressCall = () => {
            EMailAddress.from({
                value: "Becker@-gmx.de"
            });
        };
        expect(invalidEMailAddressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])+[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])$/"
            )
        );
    });
});
