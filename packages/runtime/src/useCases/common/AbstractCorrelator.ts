import { ICorrelator } from "@nmshd/transport";

export abstract class AbstractCorrelator implements ICorrelator {
    public abstract withId<R>(id: string, work: () => R): R;
    public abstract withId<R>(work: () => R): R;
    public abstract bindId<W extends Function>(id: string, work: W): W;
    public abstract bindId<W extends Function>(work: W): W;
    public abstract getId(): string | undefined;
    public abstract setId(id: string): undefined;
}
