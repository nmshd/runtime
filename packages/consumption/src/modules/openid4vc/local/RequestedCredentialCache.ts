import { serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreSynchronizable, SynchronizedCollection } from "@nmshd/transport";
import { OpenId4VciCredentialResponseJSON } from "./OpenId4VciCredentialResponseJSON";

class RequestedCredentialCacheEntry extends CoreSynchronizable {
    public override technicalProperties: string[] = ["entry"];

    @serialize({ any: true })
    @validate()
    public entry: OpenId4VciCredentialResponseJSON[];

    public static create(credentialOfferUrl: string, entry: any): RequestedCredentialCacheEntry {
        return this.fromAny<RequestedCredentialCacheEntry>({
            id: CoreId.from(credentialOfferUrl),
            entry: entry
        });
    }
}

export class RequestedCredentialCache {
    public constructor(private readonly collection: SynchronizedCollection) {}

    public async get(credentialOfferUrl: string): Promise<OpenId4VciCredentialResponseJSON[] | undefined> {
        const doc = await this.collection.read(credentialOfferUrl);
        return doc ? RequestedCredentialCacheEntry.fromAny(doc).entry : undefined;
    }

    public async set(credentialOfferUrl: string, credentials: OpenId4VciCredentialResponseJSON[]): Promise<void> {
        await this.collection.create(RequestedCredentialCacheEntry.create(credentialOfferUrl, credentials));
    }
}
