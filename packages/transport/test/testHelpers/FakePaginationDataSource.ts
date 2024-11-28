import { IPaginationDataSource } from "../../src";

export class FakePaginationDataSource<T> implements IPaginationDataSource<T> {
    public constructor(private readonly pages: T[][]) {}

    public getPage(pageNumber: number): Promise<T[]> {
        return Promise.resolve(this.pages.at(-1));
    }

    public static empty<T>(): FakePaginationDataSource<T> {
        return new FakePaginationDataSource([]);
    }
}
