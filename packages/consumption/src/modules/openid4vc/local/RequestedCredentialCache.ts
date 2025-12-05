import { serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreSynchronizable, SynchronizedCollection } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { OpenId4VciCredentialResponseJSON } from "./OpenId4VciCredentialResponseJSON";

class RequestedCredentialCacheEntry extends CoreSynchronizable {
    public override technicalProperties: string[] = [nameof<RequestedCredentialCacheEntry>((r) => r.credentialResponses)];

    @serialize({ any: true })
    @validate()
    public credentialResponses: OpenId4VciCredentialResponseJSON[];

    public static create(credentialOfferUrl: string, credentialResponses: OpenId4VciCredentialResponseJSON[]): RequestedCredentialCacheEntry {
        return this.fromAny<RequestedCredentialCacheEntry>({ id: CoreId.from(credentialOfferUrl), credentialResponses });
    }
}

export class RequestedCredentialCache {
    public constructor(private readonly collection: SynchronizedCollection) {}

    public async get(credentialOfferUrl: string): Promise<OpenId4VciCredentialResponseJSON[] | undefined> {
        const doc = await this.collection.read(credentialOfferUrl);
        return doc ? RequestedCredentialCacheEntry.fromAny(doc).credentialResponses : undefined;
    }

    public async set(credentialOfferUrl: string, credentialResponses: OpenId4VciCredentialResponseJSON[]): Promise<void> {
        await this.collection.create(RequestedCredentialCacheEntry.create(credentialOfferUrl, credentialResponses));
    }
}
