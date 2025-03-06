import { serialize, type, validate } from "@js-soft/ts-serval";
import { RequestItemJSON } from "../..";
import {
    IdentityFileReference,
    IdentityFileReferenceJSON,
    IIdentityFileReference,
    IProprietaryFileReference,
    ProprietaryFileReference,
    ProprietaryFileReferenceJSON
} from "../../../attributes";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface TransferFileOwnershipRequestItemJSON extends RequestItemJSON {
    "@type": "TransferFileOwnershipRequestItem";
    fileReference: IdentityFileReferenceJSON | ProprietaryFileReferenceJSON;
    denyAttributeCopy?: boolean;
}

export interface ITransferFileOwnershipRequestItem extends IRequestItem {
    fileReference: IIdentityFileReference | IProprietaryFileReference;
    denyAttributeCopy?: boolean;
}

@type("TransferFileOwnershipRequestItem")
export class TransferFileOwnershipRequestItem extends RequestItem implements ITransferFileOwnershipRequestItem {
    @serialize({ unionTypes: [IdentityFileReference, ProprietaryFileReference] })
    @validate()
    public fileReference: IdentityFileReference | ProprietaryFileReference;

    @serialize()
    @validate({ nullable: true })
    public denyAttributeCopy?: boolean;

    public static from(
        value: ITransferFileOwnershipRequestItem | Omit<TransferFileOwnershipRequestItemJSON, "@type"> | TransferFileOwnershipRequestItemJSON
    ): TransferFileOwnershipRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TransferFileOwnershipRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as TransferFileOwnershipRequestItemJSON;
    }
}
