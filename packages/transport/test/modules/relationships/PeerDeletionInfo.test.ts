import { CoreDate } from "@nmshd/core-types";
import { PeerDeletionInfo, PeerDeletionStatus } from "@nmshd/transport";

describe("PeerDeletionInfo", () => {
    test("PeerDeletionInfo in status ToBeDeleted should have a default deletionDate in the Future", () => {
        const peerDeletionInfoToBeDeleted = PeerDeletionInfo.fromAny({
            deletionStatus: PeerDeletionStatus.ToBeDeleted
        });

        expect(peerDeletionInfoToBeDeleted.deletionDate.isAfter(CoreDate.local())).toBeTruthy();
    });

    test("PeerDeletionInfo in status Deleted should have a default deletionDate now or in the past", () => {
        const peerDeletionInfoDeleted = PeerDeletionInfo.fromAny({
            deletionStatus: PeerDeletionStatus.Deleted
        });

        expect(peerDeletionInfoDeleted.deletionDate.isSameOrBefore(CoreDate.local())).toBeTruthy();
    });
});
