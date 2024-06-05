import { ParsingError } from "@js-soft/ts-serval";
import { EMailAddress } from "../../src";

describe("Test valid EMailAdresses", () => {
    const validEMailAddresses = ["peter123@inwind.it", "peter123@inwänd.it"];

    test.each(validEMailAddresses)("EMail %s is recognized as valid", (email) => {
        const validEMailAddress = EMailAddress.from({ value: email });
        expect(validEMailAddress.value.toString()).toBe(email);
    });
});

describe("Test invalid EMailAdresses", () => {
    const invalidEMailAddresses = ["Hugo Becker@gmx.de", "Becker@gmx", "Becker@gmx-.de", "Becker@gmx-.de", ".Becker@gmx.de", "test@.address", "test@test..address"];

    test.each(invalidEMailAddresses)("EMail %s is recognized as invalid", (email) => {
        const invalidEMailAddressCall = () => {
            EMailAddress.from({
                value: email
            });
        };
        expect(invalidEMailAddressCall).toThrow(
            new ParsingError(
                "EMailAddress",
                "value",
                "Value does not match regular expression /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9ÄäÖöÜüß](?:[A-Za-z0-9ÄäÖöÜüß-]{0,61}[A-Za-z0-9ÄäÖöÜüß])?[.])+[A-Za-z0-9ÄäÖöÜüß](?:[A-Za-z0-9ÄäÖöÜüß-]{0,61}[A-Za-z0-9ÄäÖöÜüß])$/"
            )
        );
    });
});
