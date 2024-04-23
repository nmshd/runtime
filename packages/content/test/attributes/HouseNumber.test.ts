import { ParsingError } from "@js-soft/ts-serval";
import { CountryAlpha2, StreetAddress } from "../../src";

describe("creation of RepositoryAttributes of Attribute Value Type Streetadress", function () {
    test("can create a RepositoryAttribute of Attribute Value Type Streetadress", function () {
        const validStreetAdress = StreetAddress.from({
            recipient: "Hugo Becker",
            street: "Luisenstr.",
            houseNo: "7",
            zipCode: "76646",
            city: "Bruchsal",
            country: CountryAlpha2.DE,
            state: "Baden-Württemberg"
        });
        expect(validStreetAdress.recipient.toString()).toBe("Hugo Becker");
        expect(validStreetAdress.street.toString()).toBe("Luisenstr.");
        expect(validStreetAdress.houseNo.toString()).toBe("7");
        expect(validStreetAdress.zipCode.toString()).toBe("76646");
        expect(validStreetAdress.city.toString()).toBe("Bruchsal");
        expect(validStreetAdress.country.toString()).toBe(CountryAlpha2.DE);
        expect(validStreetAdress.state?.toString()).toBe("Baden-Württemberg");
    });
    test("returns an error when trying to create an Attribute Value Type Streetadress with an invalid value for houseNo.", function () {
        const invalidStreetAdressCall = () => {
            StreetAddress.from({
                recipient: "Hugo Becker",
                street: "Luisenstr.",
                houseNo: "Hausnummer",
                zipCode: "76646",
                city: "Bruchsal",
                country: CountryAlpha2.DE,
                state: "Baden-Württemberg"
            });
        };
        expect(invalidStreetAdressCall).toThrow(
            new ParsingError("HouseNumber", "value", "Value does not match regular expression /^[1-9]{1,}[0-9]{0,}(?:[/-][1-9]{1,}[0-9]{0,}){0,}[A-Z]{0,}$/i")
        );
    });
    test("returns an error when trying to create an Attribute Value Type Streetadress with another invalid value for houseNo.", function () {
        const invalidStreetAdressCall = () => {
            StreetAddress.from({
                recipient: "Hugo Becker",
                street: "Luisenstr.",
                houseNo: "34/",
                zipCode: "76646",
                city: "Bruchsal",
                country: CountryAlpha2.DE,
                state: "Baden-Württemberg"
            });
        };
        expect(invalidStreetAdressCall).toThrow(
            new ParsingError("HouseNumber", "value", "Value does not match regular expression /^[1-9]{1,}[0-9]{0,}(?:[/-][1-9]{1,}[0-9]{0,}){0,}[A-Z]{0,}$/i")
        );
    });
});
