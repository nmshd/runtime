import { ValidationError } from "@js-soft/ts-serval";
import { LocalAttributeShareInfo, LocalAttributeShareInfoJSON } from "../../../src";

describe("LocalAttributeShareInfo", function () {
    const validShareInfoJsonParams: LocalAttributeShareInfoJSON[] = [
        {
            requestReference: "requestReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId"
        },
        {
            notificationReference: "notificationReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId"
        },
        {
            requestReference: "requestReferenceId",
            peer: "peerAddress"
        },
        {
            notificationReference: "notificationReferenceId",
            peer: "peerAddress"
        },
        {
            notificationReference: "notificationReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId",
            thirdPartyAddress: "thirdPartyAddress"
        },
        {
            requestReference: "requestReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId",
            thirdPartyAddress: "thirdPartyAddress"
        }
    ];
    test.each(validShareInfoJsonParams)("should create objects from valid parameters using from()", function (shareInfoParams: LocalAttributeShareInfoJSON) {
        const shareInfo = LocalAttributeShareInfo.from(shareInfoParams);
        expect(shareInfo.requestReference?.toJSON()).toStrictEqual(shareInfoParams.requestReference);
        expect(shareInfo.notificationReference?.toJSON()).toStrictEqual(shareInfoParams.notificationReference);
        expect(shareInfo.peer.toJSON()).toStrictEqual(shareInfoParams.peer);
        expect(shareInfo.sourceAttribute?.toJSON()).toStrictEqual(shareInfoParams.sourceAttribute);
    });

    const invalidShareInfoJsonParams: LocalAttributeShareInfoJSON[] = [
        {
            notificationReference: "notificationReferenceId",
            requestReference: "requestReferenceId",
            peer: "peerAddress"
        },
        {
            peer: "peerAddress"
        }
    ];
    test.each(invalidShareInfoJsonParams)(
        "should reject invalid parameters when using from()",

        function (shareInfoParams: LocalAttributeShareInfoJSON) {
            expect(() => {
                LocalAttributeShareInfo.from(shareInfoParams);
            }).toThrow(ValidationError);
        }
    );
});
