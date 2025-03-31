import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, FileClient, Paginator, PaginatorPercentageCallback, Transport } from "../../../src";
import { FakePaginationDataSource } from "../../testHelpers/FakePaginationDataSource";
import { TestUtil } from "../../testHelpers/TestUtil";

async function itereateThroughAllItemsAsynchronously<T>(paginator: Paginator<T>) {
    for await (const _ of paginator) {
        // noop
    }
}

describe("Paginator", function () {
    describe("End2End", function () {
        let connection: IDatabaseConnection;

        let transport: Transport;

        const fileCount = 10;

        let testAccount: AccountController;

        beforeAll(async function () {
            connection = await TestUtil.createDatabaseConnection();
            transport = TestUtil.createTransport();

            await transport.init();

            const accounts = await TestUtil.provideAccounts(transport, connection, 1);
            testAccount = accounts[0];

            const buffer = CoreBuffer.fromUtf8("a");
            const filesPromises = Array.from(Array(fileCount).keys()).map(() => TestUtil.uploadFile(testAccount, buffer));
            await Promise.all(filesPromises);
        });

        afterAll(async function () {
            await testAccount.close();
            await connection.close();
        });

        test("should get all files", async function () {
            const fileController = (testAccount.files as any).client as FileClient;

            const result = await fileController.getFiles({ pageSize: 1 } as any);
            const paginator = result.value;

            const files = [];

            for await (const file of paginator) {
                files.push(file);
            }

            expect(files).toHaveLength(fileCount);
        });
    });

    describe("Unit", function () {
        const createPaginator = (pages: number[][], progressCallback?: PaginatorPercentageCallback) => {
            const totalRecords = pages.flat().length;

            return new Paginator<number>(
                pages[0],
                {
                    pageNumber: 1,
                    pageSize: pages[0].length,
                    totalPages: pages.length,
                    totalRecords: totalRecords
                },
                new FakePaginationDataSource(pages),
                progressCallback
            );
        };

        test("should iterate over all items", async function () {
            const paginator = createPaginator([
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ]);

            const items = [];
            for await (const item of paginator) {
                items.push(item);
            }

            expect(items).toHaveLength(9);
        });

        test("should iterate incomplete pages", async function () {
            const paginator = createPaginator([[1, 2, 3], [4, 5, 6], [7]]);

            const items = [];
            for await (const item of paginator) {
                items.push(item);
            }

            expect(items).toHaveLength(7);
        });

        test("should iterate empty pages", async function () {
            const paginator = createPaginator([[]]);

            const items = [];
            for await (const item of paginator) {
                items.push(item);
            }

            expect(items).toHaveLength(0);
        });

        test("should iterate one page", async function () {
            const paginator = createPaginator([[1, 2, 3]]);

            const items = [];
            for await (const item of paginator) {
                items.push(item);
            }

            expect(items).toHaveLength(3);
        });

        test("should collect all items", async function () {
            const paginator = createPaginator([
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ]);

            const items = await paginator.collect();
            expect(items).toHaveLength(9);
        });

        test("should collect incomplete pages", async function () {
            const paginator = createPaginator([[1, 2, 3], [4, 5, 6], [7]]);

            const items = await paginator.collect();
            expect(items).toHaveLength(7);
        });

        test("should collect empty pages", async function () {
            const paginator = createPaginator([[]]);

            const items = await paginator.collect();
            expect(items).toHaveLength(0);
        });

        test("should collect one page", async function () {
            const paginator = createPaginator([[1, 2, 3]]);

            const items = await paginator.collect();
            expect(items).toHaveLength(3);
        });

        test("should call the paginator callback with 20 items", async function () {
            const percentages: number[] = [];

            const paginator = createPaginator(
                [
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                ],
                (percentage: number) => percentages.push(percentage)
            );

            await itereateThroughAllItemsAsynchronously(paginator);

            expect(percentages).toStrictEqual([0, 50, 100]);
        });

        test("should call the paginator callback with 19 items", async function () {
            const percentages: number[] = [];

            const paginator = createPaginator(
                [
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    [1, 2, 3, 4, 5, 6, 7, 8, 9]
                ],
                (percentage: number) => percentages.push(percentage)
            );

            await itereateThroughAllItemsAsynchronously(paginator);

            expect(percentages).toStrictEqual([0, 53, 100]);
        });

        test("should call the paginator callback with 199 items", async function () {
            const percentages: number[] = [];

            const paginator = createPaginator([Array.from(Array(100).keys()), Array.from(Array(99).keys())], (percentage: number) => percentages.push(percentage));

            await itereateThroughAllItemsAsynchronously(paginator);

            expect(percentages).toHaveLength(21);
        });

        test("should call the paginator callback by calling collect", async function () {
            const percentages: number[] = [];

            const paginator = createPaginator(
                [
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                ],
                (percentage: number) => percentages.push(percentage)
            );

            await paginator.collect();

            expect(percentages).toStrictEqual([0, 50, 100]);
        });
    });
});
