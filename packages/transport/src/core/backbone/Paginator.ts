import { PaginationProperties } from "./PlatformResponse.js";

export interface IPaginationDataSource<T> {
    getPage(pageNumber: number): Promise<T[]>;
}

export type PaginatorPercentageCallback = (percentage: number) => void;

export class Paginator<T> implements AsyncIterable<T> {
    private currentItemIndex = 0;
    private processedItemCount = 0;

    public constructor(
        private currentPage: T[],
        private readonly paginationProperties: PaginationProperties,
        private readonly dataSource: IPaginationDataSource<T>,
        private readonly progessCallback?: PaginatorPercentageCallback
    ) {
        if (progessCallback) progessCallback(0);
    }

    private hasNext() {
        return this.hasNextPage() || this.currentItemIndex < this.currentPage.length;
    }

    private async next() {
        const isAtEndOfPage = this.currentItemIndex >= this.currentPage.length;
        if (isAtEndOfPage && this.hasNextPage()) {
            this.currentItemIndex = 0;
            this.currentPage = await this.nextPage();
        }

        this.processedItemCount++;
        this.sendProgess();

        return this.currentPage[this.currentItemIndex++];
    }

    private sendProgess() {
        if (!this.progessCallback) return;
        if (this.processedItemCount === this.paginationProperties.totalRecords) return this.progessCallback(100);

        if (this.processedItemCount % 10 !== 0) return;
        this.progessCallback(Math.round((this.processedItemCount / this.paginationProperties.totalRecords) * 100));
    }

    private hasNextPage() {
        return this.paginationProperties.pageNumber < this.paginationProperties.totalPages;
    }

    private async nextPage() {
        this.paginationProperties.pageNumber++;
        const response = await this.dataSource.getPage(this.paginationProperties.pageNumber);
        return response;
    }

    public async collect(): Promise<T[]> {
        const collection = this.currentPage;
        this.progessCallback?.(this.pagePercentage);

        while (this.hasNextPage()) {
            collection.push(...(await this.nextPage()));

            this.progessCallback?.(this.pagePercentage);
        }

        return collection;
    }

    public [Symbol.asyncIterator](): AsyncIterator<T, any, undefined> {
        return {
            next: async () => (this.hasNext() ? { value: await this.next(), done: false } : { value: undefined, done: true })
        };
    }

    public get pagePercentage(): number {
        return Math.round((this.paginationProperties.pageNumber / this.paginationProperties.totalPages) * 100);
    }

    public get totalRecords(): number {
        return this.paginationProperties.totalRecords;
    }
}
