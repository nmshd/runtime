import { serialize, type, validate } from "@js-soft/ts-serval";
import { FileReference, IFileReference } from "@nmshd/core-types";
import { RequestItemJSON } from "../..";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface TransferFileOwnershipRequestItemJSON extends RequestItemJSON {
    "@type": "TransferFileOwnershipRequestItem";
    fileReference: string;
}

export interface ITransferFileOwnershipRequestItem extends IRequestItem {
    fileReference: IFileReference;
}

@type("TransferFileOwnershipRequestItem")
export class TransferFileOwnershipRequestItem extends RequestItem implements ITransferFileOwnershipRequestItem {
    @serialize({ enforceString: true, customDeserializer: (value: string) => FileReference.from(value), customSerializer: (value: FileReference) => value.truncate() })
    @validate()
    public fileReference: FileReference;

    public static from(
        value: ITransferFileOwnershipRequestItem | Omit<TransferFileOwnershipRequestItemJSON, "@type"> | TransferFileOwnershipRequestItemJSON
    ): TransferFileOwnershipRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TransferFileOwnershipRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as TransferFileOwnershipRequestItemJSON;
    }
}
