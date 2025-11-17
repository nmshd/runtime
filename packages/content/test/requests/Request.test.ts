import { Serializable, type } from "@js-soft/ts-serval";
import { IRequest, IRequestItem, IRequestItemGroup, Request, RequestItem, RequestItemGroup, RequestItemGroupJSON, RequestItemJSON, RequestJSON } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/core-types";

interface TestRequestItemJSON extends RequestItemJSON {
    "@type": "TestRequestItem";
}

interface ITestRequestItem extends IRequestItem {}

@type("TestRequestItem")
class TestRequestItem extends RequestItem {}

describe("Request", function () {
    test("creates a Request and items from JSON", function () {
        const requestJSON = {
            "@type": "Request",
            "@version": "2",
            items: [
                {
                    "@type": "TestRequestItem",
                    mustBeAccepted: true
                } as TestRequestItemJSON,
                {
                    "@type": "RequestItemGroup",
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: true
                        } as TestRequestItemJSON
                    ]
                } as RequestItemGroupJSON
            ]
        } as RequestJSON;

        const request = Request.from(requestJSON);

        expect(request).toBeInstanceOf(Request);
        expect(request.items).toHaveLength(2);

        const outerRequestItem = request.items[0] as TestRequestItem;
        const requestItemGroup = request.items[1] as RequestItemGroup;
        expect(outerRequestItem).toBeInstanceOf(TestRequestItem);
        expect(requestItemGroup).toBeInstanceOf(RequestItemGroup);

        expect(requestItemGroup.items).toHaveLength(1);
    });

    test("creates a Request and items from serval interface", function () {
        const requestInterface = {
            "@type": "Request",
            id: CoreId.from("REQ1"),
            items: [
                {
                    "@type": "TestRequestItem",
                    expiresAt: CoreDate.utc(),
                    mustBeAccepted: true
                } as ITestRequestItem,
                {
                    "@type": "RequestItemGroup",
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: true
                        } as ITestRequestItem
                    ]
                } as IRequestItemGroup
            ]
        } as IRequest;

        // const request = Serializable.fromUnknown(requestInterface) as Request
        const request = Request.from(requestInterface);

        expect(request).toBeInstanceOf(Request);
        expect(request.items).toHaveLength(2);

        const outerRequestItem = request.items[0] as TestRequestItem;
        const requestItemGroup = request.items[1] as RequestItemGroup;
        expect(outerRequestItem).toBeInstanceOf(TestRequestItem);
        expect(requestItemGroup).toBeInstanceOf(RequestItemGroup);

        expect(requestItemGroup.items).toHaveLength(1);
    });

    test("keeps all properties during serialization and deserialization", function () {
        const requestJSON = {
            "@type": "Request",
            id: "CNSREQ1",
            expiresAt: "2020-01-01T00:00:00.000Z",
            items: [
                {
                    "@type": "TestRequestItem",
                    mustBeAccepted: true,
                    description: "outer item - description",
                    metadata: {
                        aMetadataKey: "outer item - metadata value"
                    }
                } as TestRequestItemJSON,
                {
                    "@type": "RequestItemGroup",
                    title: "item group - title",
                    description: "item group - description",
                    metadata: {
                        aMetadataKey: "item group - metadata value"
                    },
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: true,
                            description: "inner item - description",
                            metadata: {
                                aMetadataKey: "inner item - metadata value"
                            }
                        } as TestRequestItemJSON
                    ]
                } as RequestItemGroupJSON
            ]
        } as RequestJSON;

        const request = Request.from(requestJSON);

        const serializedRequest = request.toJSON();

        expect(serializedRequest).toStrictEqual(requestJSON);
    });

    test("must have at least one item", function () {
        const requestJSON = {
            "@type": "Request",
            items: []
        } as RequestJSON;

        const errorMessage = "*Request.items*may not be empty";
        const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

        expect(() => Request.from(requestJSON)).toThrow(regex);
    });

    test("groups must have at least one item", function () {
        const requestJSON = {
            "@type": "Request",
            id: "CNSREQ1",
            expiresAt: "2020-01-01T00:00:00.000Z",
            items: [
                {
                    "@type": "RequestItemGroup",
                    items: []
                } as RequestItemGroupJSON
            ]
        } as RequestJSON;

        const errorMessage = "*RequestItemGroup.items*may not be empty*";
        const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

        expect(() => Request.from(requestJSON)).toThrow(regex);
    });

    test("mustBeAccepted is mandatory", function () {
        const requestJSON = {
            "@type": "Request",
            items: [
                {
                    "@type": "TestRequestItem"
                }
            ]
        } as RequestJSON;

        const errorMessage = "TestRequestItem.mustBeAccepted*Value is not defined";
        const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

        expect(() => Serializable.fromUnknown(requestJSON)).toThrow(regex);
    });
});
