import { ClientResult, RESTClient } from "@nmshd/transport";

export class RestClientMocker<T extends RESTClient> {
    private readonly mockedMethods: { fnName: keyof T; originalProperty: any }[] = [];
    public constructor(private client: T) {}
    public mockMethod(fnName: keyof T, callback: () => ClientResult<any>): void {
        this.mockedMethods.push({ fnName, originalProperty: this.client[fnName] });

        const mockFn = jest.fn().mockImplementation(() => {
            return Promise.resolve(callback());
        });
        this.client[fnName] = mockFn.bind(this.client);
    }

    public restore(): void {
        for (const { fnName, originalProperty } of this.mockedMethods) {
            this.client[fnName] = originalProperty;
        }
    }
}
