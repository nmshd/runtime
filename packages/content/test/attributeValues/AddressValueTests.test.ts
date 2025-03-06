import { City, Country, CountryAlpha2, DeliveryBoxAddress, HouseNumber, PhoneNumber, PostOfficeBoxAddress, State, Street, StreetAddress, ZipCode } from "../../src";
import { GenericValueTest } from "./GenericValueTest";

new GenericValueTest().runParametrized({
    testName: "Address Test",
    typeName: "StreetAddress",
    typeClass: StreetAddress,
    expectedJSON: {
        "@type": "StreetAddress",
        recipient: "aRecipient",
        street: "aStreet",
        houseNo: "1",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE
    },
    valueJSON: {
        "@type": "StreetAddress",
        recipient: "aRecipient",
        street: "aStreet",
        houseNo: "1",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE
    },
    valueVerboseJSON: {
        "@type": "StreetAddress",
        recipient: "aRecipient",
        street: { value: "aStreet" },
        houseNo: { value: "1" },
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE }
    },
    valueInterface: {
        recipient: "aRecipient",
        street: Street.fromAny("aStreet"),
        houseNo: HouseNumber.fromAny("1"),
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE)
    },
    valueString: "aRecipient\naStreet 7\n12345 aCity\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "Address Test (with State)",
    typeName: "StreetAddress",
    typeClass: StreetAddress,
    expectedJSON: {
        "@type": "StreetAddress",
        recipient: "aRecipient",
        street: "aStreet",
        houseNo: "1",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueJSON: {
        "@type": "StreetAddress",
        recipient: "aRecipient",
        street: "aStreet",
        houseNo: "1",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueVerboseJSON: {
        "@type": "StreetAddress",
        recipient: "aRecipient",
        street: { value: "aStreet" },
        houseNo: { value: "1" },
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE },
        state: { value: "aState" }
    },
    valueInterface: {
        recipient: "aRecipient",
        street: Street.fromAny("aStreet"),
        houseNo: HouseNumber.fromAny("1"),
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("aState")
    },
    valueString: "aRecipient\naStreet 7\n12345 aCity\naState\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "PostOfficeBoxAddress Test",
    typeName: "PostOfficeBoxAddress",
    typeClass: PostOfficeBoxAddress,
    expectedJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE
    },
    valueJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE
    },
    valueVerboseJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE }
    },
    valueInterface: {
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE)
    },
    valueString: "aRecipient\naBoxId\n12345 aCity\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "PostOfficeBoxAddress Test (with State)",
    typeName: "PostOfficeBoxAddress",
    typeClass: PostOfficeBoxAddress,
    expectedJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueVerboseJSON: {
        "@type": "PostOfficeBoxAddress",
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE },
        state: { value: "aState" }
    },
    valueInterface: {
        recipient: "aRecipient",
        boxId: "aBoxId",
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("aState")
    },
    valueString: "aRecipient\naBoxId\n12345 aCity\naState\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "DeliveryBoxAddress Test",
    typeName: "DeliveryBoxAddress",
    typeClass: DeliveryBoxAddress,
    expectedJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE
    },
    valueJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE
    },
    valueVerboseJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE }
    },
    valueInterface: {
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE)
    },
    valueString: "aRecipient\naUserId\naDeliveryBoxId\n12345 aCity\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "DeliveryBoxAddress Test (with State)",
    typeName: "DeliveryBoxAddress",
    typeClass: DeliveryBoxAddress,
    expectedJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueVerboseJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE },
        state: { value: "aState" }
    },
    valueInterface: {
        recipient: "aRecipient",
        userId: "aUserId",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("aState")
    },
    valueString: "aRecipient\naUserId\naDeliveryBoxId\n12345 aCity\naState\nGermany"
});

new GenericValueTest().runParametrized({
    testName: "DeliveryBoxAddress Test (with Phone)",
    typeName: "DeliveryBoxAddress",
    typeClass: DeliveryBoxAddress,
    expectedJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        phoneNumber: "+49111222333444555",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        phoneNumber: "+49111222333444555",
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: "12345",
        city: "aCity",
        country: CountryAlpha2.DE,
        state: "aState"
    },
    valueVerboseJSON: {
        "@type": "DeliveryBoxAddress",
        recipient: "aRecipient",
        userId: "aUserId",
        phoneNumber: { value: "+49111222333444555" },
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: { value: "12345" },
        city: { value: "aCity" },
        country: { value: CountryAlpha2.DE },
        state: { value: "aState" }
    },
    valueInterface: {
        recipient: "aRecipient",
        userId: "aUserId",
        phoneNumber: PhoneNumber.fromAny("+49111222333444555"),
        deliveryBoxId: "aDeliveryBoxId",
        zipCode: ZipCode.fromAny("12345"),
        city: City.fromAny("aCity"),
        country: Country.fromAny(CountryAlpha2.DE),
        state: State.fromAny("aState")
    },
    valueString: "aRecipient\naUserId\n+49111222333444555\naDeliveryBoxId\n12345 aCity\naState\nGermany"
});
