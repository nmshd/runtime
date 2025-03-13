import { type } from "@js-soft/ts-serval";
import { IReference, Reference } from "./Reference";

export interface IFileReference extends IReference {}

@type("FileReference")
export class FileReference extends Reference implements IFileReference {
    protected static override preFrom(value: any): any {
        // super.validateId(value, BackboneIds.file);

        return value;
    }

    public static override from(value: IFileReference | string): FileReference {
        return super.from(value);
    }
}
