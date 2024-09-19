export interface ICorrelator {
    withId<R>(id: string, work: () => R): R;
    withId<R>(work: () => R): R;
    bindId<W extends Function>(id: string, work: W): W;
    bindId<W extends Function>(work: W): W;
    getId(): string | undefined;
    setId(id: string): undefined;
}
