import { ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { CoreCrypto, TransportCoreErrors } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { ControllerName, TransportController } from "../../core/TransportController";
import { PeerRelationshipTemplateLoadedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { Relationship } from "../relationships/local/Relationship";
import { RelationshipSecretController } from "../relationships/RelationshipSecretController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { BackboneGetRelationshipTemplatesResponse } from "./backbone/BackboneGetRelationshipTemplates";
import { RelationshipTemplateClient } from "./backbone/RelationshipTemplateClient";
import { CachedRelationshipTemplate } from "./local/CachedRelationshipTemplate";
import { RelationshipTemplate } from "./local/RelationshipTemplate";
import { ISendRelationshipTemplateParameters, SendRelationshipTemplateParameters } from "./local/SendRelationshipTemplateParameters";
import { RelationshipTemplateContentWrapper } from "./transmission/RelationshipTemplateContentWrapper";
import { RelationshipTemplateReference } from "./transmission/RelationshipTemplateReference";
import { RelationshipTemplateSigned } from "./transmission/RelationshipTemplateSigned";

export class RelationshipTemplateController extends TransportController {
    protected readonly client: RelationshipTemplateClient;
    protected templates: SynchronizedCollection;
    protected readonly secrets: RelationshipSecretController;

    public constructor(parent: AccountController, secrets: RelationshipSecretController, controllerName?: ControllerName) {
        super(controllerName ? controllerName : ControllerName.RelationshipTemplate, parent);
        this.secrets = secrets;
        this.client = new RelationshipTemplateClient(this.config, this.parent.authenticator, this.transport.correlator);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.templates = await this.parent.getSynchronizedCollection(DbCollectionName.RelationshipTemplates);

        return this;
    }

    public async sendRelationshipTemplate(parameters: ISendRelationshipTemplateParameters): Promise<RelationshipTemplate> {
        parameters = SendRelationshipTemplateParameters.from(parameters);

        const templateKey = await this.secrets.createTemplateKey();

        const templateContent = RelationshipTemplateContentWrapper.from({
            content: parameters.content,
            identity: this.parent.identity.identity,
            templateKey: templateKey
        });

        const secretKey = await CoreCrypto.generateSecretKey();
        const serializedTemplate = templateContent.serialize();
        const serializedTemplateBuffer = CoreBuffer.fromUtf8(serializedTemplate);

        const signature = await this.parent.identity.sign(serializedTemplateBuffer);
        const signedTemplate = RelationshipTemplateSigned.from({
            deviceSignature: signature,
            serializedTemplate: serializedTemplate
        });
        const signedTemplateBuffer = CoreBuffer.fromUtf8(signedTemplate.serialize());

        const cipher = await CoreCrypto.encrypt(signedTemplateBuffer, secretKey);

        const backboneResponse = (
            await this.client.createRelationshipTemplate({
                expiresAt: parameters.expiresAt.toString(),
                maxNumberOfAllocations: parameters.maxNumberOfAllocations,
                content: cipher.toBase64()
            })
        ).value;

        const templateCache = CachedRelationshipTemplate.from({
            content: parameters.content,
            createdAt: CoreDate.from(backboneResponse.createdAt),
            createdBy: this.parent.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            expiresAt: parameters.expiresAt,
            identity: this.parent.identity.identity,
            maxNumberOfAllocations: parameters.maxNumberOfAllocations,
            templateKey: templateKey
        });

        const template = RelationshipTemplate.from({
            id: CoreId.from(backboneResponse.id),
            secretKey: secretKey,
            isOwn: true,
            cache: templateCache,
            cachedAt: CoreDate.utc()
        });

        await this.templates.create(template);

        return template;
    }

    public async deleteRelationshipTemplate(template: RelationshipTemplate): Promise<void> {
        const response = await this.client.deleteRelationshipTemplate(template.id.toString());
        if (response.isError) throw response.error;

        await this.templates.delete(template);
    }

    public async getRelationshipTemplates(query?: any): Promise<RelationshipTemplate[]> {
        const templateDocs = await this.templates.find(query);
        return this.parseArray<RelationshipTemplate>(templateDocs, RelationshipTemplate);
    }

    public async updateCache(ids: string[]): Promise<RelationshipTemplate[]> {
        if (ids.length < 1) {
            return [];
        }

        const resultItems = (await this.client.getRelationshipTemplates({ ids })).value;
        const promises = [];
        for await (const resultItem of resultItems) {
            promises.push(this.updateCacheOfExistingTemplateInDb(resultItem.id, resultItem));
        }

        return await Promise.all(promises);
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedRelationshipTemplate }[]> {
        if (ids.length === 0) return [];

        const backboneRelationships = await (await this.client.getRelationshipTemplates({ ids: ids.map((id) => id.id) })).value.collect();

        const decryptionPromises = backboneRelationships.map(async (t) => {
            const templateDoc = await this.templates.read(t.id);
            if (!templateDoc) {
                this._log.error(
                    `Template '${t.id}' not found in local database and the cache fetching was therefore skipped. This should not happen and might be a bug in the application logic.`
                );
                return;
            }

            const template = RelationshipTemplate.from(templateDoc);

            return { id: CoreId.from(t.id), cache: await this.decryptRelationshipTemplate(t, template.secretKey) };
        });

        const caches = await Promise.all(decryptionPromises);
        return caches.filter((c) => c !== undefined);
    }

    @log()
    private async updateCacheOfExistingTemplateInDb(id: string, response?: BackboneGetRelationshipTemplatesResponse) {
        const templateDoc = await this.templates.read(id);
        if (!templateDoc) {
            throw TransportCoreErrors.general.recordNotFound(RelationshipTemplate, id);
        }

        const template = RelationshipTemplate.from(templateDoc);

        await this.updateCacheOfTemplate(template, response);
        await this.templates.update(templateDoc, template);
        return template;
    }

    private async updateCacheOfTemplate(template: RelationshipTemplate, response?: BackboneGetRelationshipTemplatesResponse) {
        if (!response) {
            response = (await this.client.getRelationshipTemplate(template.id.toString())).value;
        }

        const cachedTemplate = await this.decryptRelationshipTemplate(response, template.secretKey);
        template.setCache(cachedTemplate);

        // Update isOwn, as it is possible that the identity receives an own template.
        template.isOwn = this.parent.identity.isMe(cachedTemplate.createdBy);
    }

    @log()
    private async decryptRelationshipTemplate(response: BackboneGetRelationshipTemplatesResponse, secretKey: CryptoSecretKey) {
        const cipher = CryptoCipher.fromBase64(response.content);
        const signedTemplateBuffer = await this.secrets.decryptTemplate(cipher, secretKey);

        const signedTemplate = RelationshipTemplateSigned.deserialize(signedTemplateBuffer.toUtf8());
        const templateContent = RelationshipTemplateContentWrapper.deserialize(signedTemplate.serializedTemplate);

        const templateSignatureValid = await this.secrets.verifyTemplate(
            CoreBuffer.fromUtf8(signedTemplate.serializedTemplate),
            signedTemplate.deviceSignature,
            templateContent.identity.publicKey
        );

        if (!templateSignatureValid) {
            throw TransportCoreErrors.general.signatureNotValid("template");
        }

        const cachedTemplate = CachedRelationshipTemplate.from({
            content: templateContent.content,
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: response.expiresAt ? CoreDate.from(response.expiresAt) : undefined,
            identity: templateContent.identity,
            maxNumberOfAllocations: response.maxNumberOfAllocations ?? undefined,
            templateKey: templateContent.templateKey
        });

        return cachedTemplate;
    }

    public async getRelationshipTemplate(id: CoreId): Promise<RelationshipTemplate | undefined> {
        const templateDoc = await this.templates.read(id.toString());
        if (!templateDoc) {
            return;
        }
        return RelationshipTemplate.from(templateDoc);
    }

    @log()
    public async setRelationshipTemplateMetadata(idOrTemplate: CoreId | RelationshipTemplate, metadata: ISerializable): Promise<RelationshipTemplate> {
        const id = idOrTemplate instanceof CoreId ? idOrTemplate.toString() : idOrTemplate.id.toString();
        const templateDoc = await this.templates.read(id);
        if (!templateDoc) {
            throw TransportCoreErrors.general.recordNotFound(RelationshipTemplate, id.toString());
        }

        const template = RelationshipTemplate.from(templateDoc);
        template.setMetadata(metadata);
        await this.templates.update(templateDoc, template);

        return template;
    }

    public async loadPeerRelationshipTemplateByTruncated(truncated: string): Promise<RelationshipTemplate> {
        const reference = RelationshipTemplateReference.fromTruncated(truncated);
        return await this.loadPeerRelationshipTemplateByReference(reference);
    }

    public async loadPeerRelationshipTemplateByReference(relationshipTemplateReference: RelationshipTemplateReference): Promise<RelationshipTemplate> {
        return await this.loadPeerRelationshipTemplate(relationshipTemplateReference.id, relationshipTemplateReference.key);
    }

    public async loadPeerRelationshipTemplate(id: CoreId, secretKey: CryptoSecretKey): Promise<RelationshipTemplate> {
        const templateDoc = await this.templates.read(id.toString());
        if (templateDoc) {
            const template = await this.updateCacheOfExistingTemplateInDb(id.toString());

            if (!template.isOwn) {
                this.eventBus.publish(new PeerRelationshipTemplateLoadedEvent(this.parent.identity.address.toString(), template));
            }

            return template;
        }

        const relationshipTemplate = RelationshipTemplate.from({
            id: id,
            secretKey: secretKey,
            isOwn: false
        });
        await this.updateCacheOfTemplate(relationshipTemplate);

        await this.templates.create(relationshipTemplate);

        this.eventBus.publish(new PeerRelationshipTemplateLoadedEvent(this.parent.identity.address.toString(), relationshipTemplate));

        return relationshipTemplate;
    }

    public async cleanupTemplatesOfDecomposedRelationship(relationship: Relationship): Promise<void> {
        const templateOfRelationship = relationship.cache!.template;

        if (!templateOfRelationship.isOwn || templateOfRelationship.cache!.maxNumberOfAllocations === 1) {
            await this.templates.delete(templateOfRelationship);
        }

        const otherTemplatesOfPeer = await this.getRelationshipTemplates({
            "cache.createdBy": relationship.peer.address.toString()
        });

        for (const template of otherTemplatesOfPeer) {
            await this.templates.delete(template);
        }
    }
}
