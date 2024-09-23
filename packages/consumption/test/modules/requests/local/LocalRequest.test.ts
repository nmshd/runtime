import { ResponseItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { LocalRequest, LocalRequestStatus, LocalRequestStatusLogEntry, LocalResponse } from "../../../../src";
import { TestObjectFactory } from "../testHelpers/TestObjectFactory";
import { TestRequestItem } from "../testHelpers/TestRequestItem";

describe("LocalRequest", function () {
    test("creates objects of all nested classes", function () {
        const request = TestObjectFactory.createLocalRequestWith({
            contentProperties: {},
            status: LocalRequestStatus.Open,
            statusLogEntries: [
                LocalRequestStatusLogEntry.from({
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    oldStatus: LocalRequestStatus.Open,
                    newStatus: LocalRequestStatus.Completed
                })
            ]
        });

        expect(request).toBeInstanceOf(LocalRequest);
        expect(request.content.items[0]).toBeInstanceOf(TestRequestItem);
        expect(request.response).toBeInstanceOf(LocalResponse);
        expect(request.response!.content.items[0]).toBeInstanceOf(ResponseItem);
        expect(request.statusLog[0]).toBeInstanceOf(LocalRequestStatusLogEntry);
    });

    describe("changeStatus", function () {
        test("changes the status", function () {
            const request = TestObjectFactory.createLocalRequestWith({});

            request.changeStatus(LocalRequestStatus.Completed);

            expect(request.status).toStrictEqual(LocalRequestStatus.Completed);
        });

        test("adds a status log entry on status change", function () {
            const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Draft });
            request.changeStatus(LocalRequestStatus.Open);

            expect(request.statusLog).toHaveLength(1);
            expect(request.statusLog[0].oldStatus).toStrictEqual(LocalRequestStatus.Draft);
            expect(request.statusLog[0].newStatus).toStrictEqual(LocalRequestStatus.Open);
        });

        test("throws an error when changing the status to the same status", function () {
            const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Open });
            expect(() => request.changeStatus(LocalRequestStatus.Open)).toThrow("cannot change status to the same status");
        });
    });

    describe("updateStatusBasedOnExpiration", function () {
        test("sets the status to expired when the Request is expired", function () {
            const request = TestObjectFactory.createLocalRequestWith({
                contentProperties: {
                    expiresAt: CoreDate.utc().subtract({ days: 1 })
                }
            });

            request.updateStatusBasedOnExpiration();
            expect(request.status).toStrictEqual(LocalRequestStatus.Expired);
        });

        test("does not change the status when the Request is expired but already completed", function () {
            const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Completed });

            request.updateStatusBasedOnExpiration();
            expect(request.status).toStrictEqual(LocalRequestStatus.Completed);
        });

        test("does not change the status when the Request is expired but already expired", function () {
            const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Expired });

            request.updateStatusBasedOnExpiration();
            expect(request.status).toStrictEqual(LocalRequestStatus.Expired);
        });
    });

    describe("updateStatusBasedOnTemplateExpiration", function () {
        test("sets the status to expired when the underlying RelationshipTemplate of the Request is expired", function () {
            const request = TestObjectFactory.createUnansweredLocalRequestBasedOnTemplateWith({});

            request.updateStatusBasedOnTemplateExpiration(CoreDate.utc().subtract({ days: 1 }));
            expect(request.status).toStrictEqual(LocalRequestStatus.Expired);
        });

        test("sets the status if the underlying RelationshipTemplate of the Request is expired and the Request has already been rejected", function () {
            const request = TestObjectFactory.createRejectedLocalRequestBasedOnTemplateWith({});

            request.updateStatusBasedOnTemplateExpiration(CoreDate.utc().subtract({ days: 1 }));
            expect(request.status).toStrictEqual(LocalRequestStatus.Expired);
        });

        test("sets expiresAt if the underlying RelationshipTemplate of the Request is expired and the Request doesn't have an expiration date", function () {
            const request = TestObjectFactory.createUnansweredLocalRequestBasedOnTemplateWith({});
            expect(request.content.expiresAt).toBeUndefined();

            const relationshipTemplateExpirationDate = CoreDate.utc().subtract({ days: 1 });
            request.updateStatusBasedOnTemplateExpiration(relationshipTemplateExpirationDate);

            expect(request.status).toStrictEqual(LocalRequestStatus.Expired);
            expect(request.content.expiresAt).toStrictEqual(relationshipTemplateExpirationDate);
        });

        test("does not set the status to expired when the underlying RelationshipTemplate of the Request is not expired", function () {
            const request = TestObjectFactory.createUnansweredLocalRequestBasedOnTemplateWith({});

            request.updateStatusBasedOnTemplateExpiration(CoreDate.utc().add({ days: 1 }));
            expect(request.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
        });

        test("does not change the status when the underlying RelationshipTemplate of the Request is expired but the Request is already completed", function () {
            const request = TestObjectFactory.createRejectedLocalRequestBasedOnTemplateWith({
                status: LocalRequestStatus.Completed
            });

            request.updateStatusBasedOnTemplateExpiration(CoreDate.utc().subtract({ days: 1 }));
            expect(request.status).toStrictEqual(LocalRequestStatus.Completed);
        });

        test("does not change the status when the underlying RelationshipTemplate of the Request is expired but the Request is already expired", function () {
            const request = TestObjectFactory.createUnansweredLocalRequestBasedOnTemplateWith({
                status: LocalRequestStatus.Expired,
                contentProperties: {
                    expiresAt: CoreDate.utc().subtract({ days: 1 })
                }
            });

            request.updateStatusBasedOnTemplateExpiration(CoreDate.utc().subtract({ days: 1 }));
            expect(request.status).toStrictEqual(LocalRequestStatus.Expired);
        });

        test("does not set status of Request to expired when Message instead of RelationshipTemplate is used", function () {
            const request = TestObjectFactory.createLocalRequestWith({});

            request.updateStatusBasedOnTemplateExpiration(CoreDate.utc().subtract({ days: 1 }));
            expect(request.status).toStrictEqual(LocalRequestStatus.Decided);
        });
    });
});
