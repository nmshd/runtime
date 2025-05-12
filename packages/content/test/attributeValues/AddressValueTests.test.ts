import { CountryAlpha2 } from "@nmshd/core-types";
import { City, Country, DeliveryBoxAddress, HouseNumber, PhoneNumber, PostOfficeBoxAddress, State, Street, StreetAddress, ZipCode } from "../../src";
import { GenericValueTest } from "./GenericValueTest";

new GenericValueTest().runParametrized({
    testName: "Address Test",
    typeName: "StreetAddress",
    typeClass: StreetAddress,
    expectedJSON: {
        "@type": "StreetAddress",
        recipient: "Hugo Becker",
        street: "Luisenstr.",
        houseNo: "7",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE
    },
    valueJSON: {
        "@type": "StreetAddress",
        recipient: "Hugo Becker",
        street: "Luisenstr.",
        houseNo: "7",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE
    },
    valueVerboseJSON: {
        "@type": "StreetAddress",
        recipient: "Hugo Becker",
        street: { value: "Luisenstr." },
        houseNo: { value: "7" },
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        street: Street.fromAny("Luisenstr."),
        houseNo: HouseNumber.fromAny("7"),
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE)
    },
    valueString: "Hugo Becker\nLuisenstr. 7\n76646 Bruchsal\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "Address Test (with State)",
    typeName: "StreetAddress",
    typeClass: StreetAddress,
    expectedJSON: {
        "@type": "StreetAddress",
        recipient: "Hugo Becker",
        street: "Luisenstr.",
        houseNo: "7",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueJSON: {
        "@type": "StreetAddress",
        recipient: "Hugo Becker",
        street: "Luisenstr.",
        houseNo: "7",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueVerboseJSON: {
        "@type": "StreetAddress",
        recipient: "Hugo Becker",
        street: { value: "Luisenstr." },
        houseNo: { value: "7" },
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE },
        state: { value: "Baden-Württemberg" }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        street: Street.fromAny("Luisenstr."),
        houseNo: HouseNumber.fromAny("7"),
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("Baden-Württemberg")
    },
    valueString: "Hugo Becker\nLuisenstr. 7\n76646 Bruchsal\nBaden-Württemberg\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "PostOfficeBoxAddress Test",
    typeName: "PostOfficeBoxAddress",
    typeClass: PostOfficeBoxAddress,
    expectedJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE
    },
    valueJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE
    },
    valueVerboseJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE)
    },
    valueString: "Hugo Becker\nPostfach 7788\n76646 Bruchsal\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "PostOfficeBoxAddress Test (with State)",
    typeName: "PostOfficeBoxAddress",
    typeClass: PostOfficeBoxAddress,
    expectedJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueVerboseJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE },
        state: { value: "Baden-Württemberg" }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        boxId: "Postfach 7788",
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("Baden-Württemberg")
    },
    valueString: "Hugo Becker\nPostfach 7788\n76646 Bruchsal\nBaden-Württemberg\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "DeliveryBoxAddress Test",
    typeName: "DeliveryBoxAddress",
    typeClass: DeliveryBoxAddress,
    expectedJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE
    },
    valueJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE
    },
    valueVerboseJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE)
    },
    valueString: "Hugo Becker\nPostnummer 883989238\nPackstation 705\n76646 Bruchsal\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "DeliveryBoxAddress Test (with State)",
    typeName: "DeliveryBoxAddress",
    typeClass: DeliveryBoxAddress,
    expectedJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueVerboseJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE },
        state: { value: "Baden-Württemberg" }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        deliveryBoxId: "Packstation 705",
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("Baden-Württemberg")
    },
    valueString: "Hugo Becker\nPostnummer 883989238\nPackstation 705\n76646 Bruchsal\nBaden-Württemberg\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "DeliveryBoxAddress Test (with Phone)",
    typeName: "DeliveryBoxAddress",
    typeClass: DeliveryBoxAddress,
    expectedJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        phoneNumber: "+49111222333444555",
        deliveryBoxId: "Packstation 705",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        phoneNumber: "+49111222333444555",
        deliveryBoxId: "Packstation 705",
        zipCode: "76646",
        city: "Bruchsal",
        country: CountryAlpha2.DE,
        state: "Baden-Württemberg"
    },
    valueVerboseJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        phoneNumber: { value: "+49111222333444555" },
        deliveryBoxId: "Packstation 705",
        zipCode: { value: "76646" },
        city: { value: "Bruchsal" },
        country: { value: CountryAlpha2.DE },
        state: { value: "Baden-Württemberg" }
    },
    valueInterface: {
        recipient: "Hugo Becker",
        userId: "Postnummer 883989238",
        phoneNumber: PhoneNumber.fromAny("+49111222333444555"),
        deliveryBoxId: "Packstation 705",
        zipCode: ZipCode.fromAny("76646"),
        city: City.fromAny("Bruchsal"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("Baden-Württemberg")
    },
    valueString: "Hugo Becker\nPostnummer 883989238\n+49111222333444555\nPackstation 705\n76646 Bruchsal\nBaden-Württemberg\nGermany"
});
