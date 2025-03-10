import { serialize, type, validate } from "@js-soft/ts-serval";
import { FileReference, IFileReference } from "@nmshd/transport";
import { RequestItemJSON } from "../..";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface TransferFileOwnershipRequestItemJSON extends RequestItemJSON {
    "@type": "TransferFileOwnershipRequestItem";
    fileReference: string;
    denyAttributeCopy?: boolean;
}

export interface ITransferFileOwnershipRequestItem extends IRequestItem {
    fileReference: IFileReference;
    denyAttributeCopy?: boolean;
}

@type("TransferFileOwnershipRequestItem")
export class TransferFileOwnershipRequestItem extends RequestItem implements ITransferFileOwnershipRequestItem {
    @serialize({ enforceString: true, customSerializer: (value: FileReference) => value.truncate() })
    @validate()
    public fileReference: FileReference;

    @serialize()
    @validate({ nullable: true })
    public denyAttributeCopy?: boolean;

    protected static override preFrom(value: any): any {
        if (typeof value.fileReference === "string") value.fileReference = FileReference.from(value.fileReference);

        return value;
    }

    public static from(
        value: ITransferFileOwnershipRequestItem | Omit<TransferFileOwnershipRequestItemJSON, "@type"> | TransferFileOwnershipRequestItemJSON
    ): TransferFileOwnershipRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TransferFileOwnershipRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as TransferFileOwnershipRequestItemJSON;
    }
}
