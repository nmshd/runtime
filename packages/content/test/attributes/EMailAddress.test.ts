import { ParsingError } from "@js-soft/ts-serval";
import { EMailAddress } from "../../src";

describe("Test valid EMailAddresses", () => {
    const validEMailAddresses = ["peter123@inwind.it", "peter123@inwänd.it"];

    test.each(validEMailAddresses)("EMail %s is recognized as valid", (email) => {
        const validEMailAddress = EMailAddress.from({ value: email });
        expect(validEMailAddress.value.toString()).toBe(email);
    });
});

describe("Test invalid EMailAddresses", () => {
    const invalidEMailAddresses = ["aGivenName aSurname@gmx.de", "aSurname@gmx", "aSurname@gmx-.de", "aSurname@gmx-.de", ".aSurname@gmx.de", "test@.address", "test@test..address"];

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
                "Value does not match regular expression /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9ÄäÖöÜüß]([A-Za-z0-9ÄäÖöÜüß-]{0,61}[A-Za-z0-9ÄäÖöÜüß])?\\.)+[A-Za-z0-9ÄäÖöÜüß][A-Za-z0-9ÄäÖöÜüß-]{0,61}[A-Za-z0-9ÄäÖöÜüß]$/"
            )
        );
    });

    test("returns an error when trying to create an Attribute Value Type EMailAddress wich is empty", function () {
        const invalidEMailAddressCall = () => {
            EMailAddress.from({
                value: ""
            });
        };
        expect(invalidEMailAddressCall).toThrow(new ParsingError("EMailAddress", "value", "Value is shorter than 3 characters"));
    });
});
