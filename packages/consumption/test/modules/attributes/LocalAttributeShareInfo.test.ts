import { ValidationError } from "@js-soft/ts-serval";
import { LocalAttributeShareInfo, LocalAttributeShareInfoJSON } from "../../../src";

describe("LocalAttributeShareInfo", function () {
    const validShareInfoJsonParams: LocalAttributeShareInfoJSON[] = [
        {
            sourceReference: "sourceReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId"
        },
        {
            notificationReference: "notificationReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId"
        },
        {
            sourceReference: "sourceReferenceId",
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
            sourceReference: "sourceReferenceId",
            peer: "peerAddress",
            sourceAttribute: "sourceAttributeId",
            thirdPartyAddress: "thirdPartyAddress"
        }
    ];
    test.each(validShareInfoJsonParams)("should create objects from valid parameters using from()", function (shareInfoParams: LocalAttributeShareInfoJSON) {
        const shareInfo = LocalAttributeShareInfo.from(shareInfoParams);
        expect(shareInfo.sourceReference?.toJSON()).toStrictEqual(shareInfoParams.sourceReference);
        expect(shareInfo.notificationReference?.toJSON()).toStrictEqual(shareInfoParams.notificationReference);
        expect(shareInfo.peer.toJSON()).toStrictEqual(shareInfoParams.peer);
        expect(shareInfo.sourceAttribute?.toJSON()).toStrictEqual(shareInfoParams.sourceAttribute);
        expect(shareInfo.thirdPartyAddress?.toJSON()).toStrictEqual(shareInfoParams.thirdPartyAddress);
    });

    const invalidShareInfoJsonParams: LocalAttributeShareInfoJSON[] = [
        {
            notificationReference: "notificationReferenceId",
            sourceReference: "sourceReferenceId",
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
