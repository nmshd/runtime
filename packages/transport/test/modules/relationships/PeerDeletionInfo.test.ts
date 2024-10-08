import { CoreDate } from "@nmshd/core-types";
import { PeerDeletionInfo, PeerDeletionStatus } from "../../../src";

describe("PeerDeletionInfo", () => {
    test("PeerDeletionInfo default values", () => {
        const peerDeletionInfoToBeDeleted = PeerDeletionInfo.fromAny({
            deletionStatus: PeerDeletionStatus.ToBeDeleted
        });
        const peerDeletionInfoDeleted = PeerDeletionInfo.fromAny({
            deletionStatus: PeerDeletionStatus.Deleted
        });

        expect(peerDeletionInfoToBeDeleted.deletionDate.isAfter(CoreDate.local())).toBeTruthy();
        expect(peerDeletionInfoDeleted.deletionDate.isSameOrBefore(CoreDate.local())).toBeTruthy();
    });
});
