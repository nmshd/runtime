import { CoreId } from "./CoreId";

export interface ICoreIdHelper {
    readonly prefix: string;

    generate(): Promise<CoreId>;
    generateUnsafe(): Promise<CoreId>;
    validate(id: string | CoreId): boolean;
}
