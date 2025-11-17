import { ProprietaryXML, SchematizedXML } from "@nmshd/content";
import { GenericValueTest } from "./GenericValueTest.js";
import hochschulabschlusszeugnisXMLData from "./hochschulabschlusszeugnis.js";

new GenericValueTest().runParametrized({
    testName: "ProprietaryXML Test",
    typeName: "ProprietaryXML",
    typeClass: ProprietaryXML,
    expectedJSON: {
        "@type": "ProprietaryXML",
        title: "XMLData",
        value: hochschulabschlusszeugnisXMLData,
        schemaURL: "https://test.com/schema.xsd",
        description: "this is the description"
    },
    valueJSON: {
        "@type": "ProprietaryXML",
        title: "XMLData",
        value: hochschulabschlusszeugnisXMLData,
        schemaURL: "https://test.com/schema.xsd",
        description: "this is the description"
    },
    valueVerboseJSON: {
        "@type": "ProprietaryXML",
        value: hochschulabschlusszeugnisXMLData,
        title: "XMLData",
        schemaURL: "https://test.com/schema.xsd",
        description: "this is the description"
    },
    valueInterface: {
        "@type": "ProprietaryXML",
        value: hochschulabschlusszeugnisXMLData,
        title: "XMLData",
        schemaURL: "https://test.com/schema.xsd",
        description: "this is the description"
    },
    valueString: hochschulabschlusszeugnisXMLData
});

new GenericValueTest().runParametrized({
    testName: "SchematizedXML Test",
    typeName: "SchematizedXML",
    typeClass: SchematizedXML,
    expectedJSON: {
        "@type": "SchematizedXML",
        value: hochschulabschlusszeugnisXMLData,
        schemaURL: "https://test.com/schema.xsd"
    },
    valueJSON: {
        "@type": "SchematizedXML",
        value: hochschulabschlusszeugnisXMLData,
        schemaURL: "https://test.com/schema.xsd"
    },
    valueVerboseJSON: {
        "@type": "SchematizedXML",
        value: hochschulabschlusszeugnisXMLData,
        schemaURL: "https://test.com/schema.xsd"
    },
    valueInterface: {
        "@type": "SchematizedXML",
        value: hochschulabschlusszeugnisXMLData,
        schemaURL: "https://test.com/schema.xsd"
    },
    valueString: hochschulabschlusszeugnisXMLData
});
