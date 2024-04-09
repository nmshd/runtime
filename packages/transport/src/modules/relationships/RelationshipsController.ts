import { ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreBuffer, CryptoSignature } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { ControllerName, CoreAddress, CoreCrypto, CoreDate, CoreId, TransportController, TransportError } from "../../core";
import { CoreErrors } from "../../core/CoreErrors";
import { CoreUtil } from "../../core/CoreUtil";
import { DbCollectionName } from "../../core/DbCollectionName";
import { TransportIds } from "../../core/TransportIds";
import { RelationshipChangedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { Identity } from "../accounts/data/Identity";
import { RelationshipTemplate } from "../relationshipTemplates/local/RelationshipTemplate";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { BackboneGetRelationshipsResponse } from "./backbone/BackboneGetRelationships";
import { RelationshipClient } from "./backbone/RelationshipClient";
import { CachedRelationship } from "./local/CachedRelationship";
import { IAuditLog, Relationship } from "./local/Relationship";
import { ISendRelationshipParameters, SendRelationshipParameters } from "./local/SendRelationshipParameters";
import { RelationshipSecretController } from "./RelationshipSecretController";
import { RelationshipStatus } from "./transmission/RelationshipStatus";
import { RelationshipCreationRequestCipher } from "./transmission/requests/RelationshipCreationRequestCipher";
import { RelationshipCreationRequestContentWrapper } from "./transmission/requests/RelationshipCreationRequestContentWrapper";
import { RelationshipCreationRequestSigned } from "./transmission/requests/RelationshipCreationRequestSigned";

export class RelationshipsController extends TransportController {
    private client: RelationshipClient;
    private relationships: SynchronizedCollection;
    private readonly secrets: RelationshipSecretController;

    public constructor(parent: AccountController, secrets: RelationshipSecretController) {
        super(ControllerName.Relationships, parent);
        this.secrets = secrets;
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new RelationshipClient(this.config, this.parent.authenticator);
        this.relationships = await this.parent.getSynchronizedCollection(DbCollectionName.Relationships);

        return this;
    }

    public async getRelationships(query?: any, withAuditLog?: boolean): Promise<Relationship[]> {
        const relationshipDocs = await this.relationships.find(query);
        const relationships = this.parseArray<Relationship>(relationshipDocs, Relationship);
        if (withAuditLog) {
            relationships.forEach((relationship) => this.addAuditLog(relationship));
        }
        return relationships;
    }

    public async updateCache(ids: string[]): Promise<Relationship[]> {
        if (ids.length < 1) {
            return [];
        }

        const resultItems = (await this.client.getRelationships({ ids })).value;
        const promises = [];
        for await (const resultItem of resultItems) {
            promises.push(this.updateCacheOfExistingRelationshipInDb(resultItem.id, resultItem));
        }
        return await Promise.all(promises);
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedRelationship }[]> {
        if (ids.length === 0) return [];

        const backboneRelationships = await (await this.client.getRelationships({ ids: ids.map((id) => id.id) })).value.collect();

        const decryptionPromises = backboneRelationships.map(async (r) => {
            const relationshipDoc = await this.relationships.read(r.id);
            const relationship = Relationship.from(relationshipDoc);

            return {
                id: CoreId.from(r.id),
                cache: await this.decryptRelationship(r, relationship.relationshipSecretId)
            };
        });

        return await Promise.all(decryptionPromises);
    }

    @log()
    private async updateCacheOfExistingRelationshipInDb(id: string, response?: BackboneGetRelationshipsResponse) {
        const relationshipDoc = await this.relationships.read(id);
        if (!relationshipDoc) throw CoreErrors.general.recordNotFound(Relationship, id);

        const relationship = Relationship.from(relationshipDoc);

        await this.updateCacheOfRelationship(relationship, response);
        await this.relationships.update(relationshipDoc, relationship);
        return relationship;
    }

    public async getRelationshipToIdentity(address: CoreAddress, status?: RelationshipStatus, withAuditLog?: boolean): Promise<Relationship | undefined> {
        const query: any = { peerAddress: address.toString() };
        if (status) query[`${nameof<Relationship>((r) => r.status)}`] = status;
        let relationshipDoc = await this.relationships.findOne(query);

        if (!relationshipDoc) {
            // If we don't find the relationship by peerAddress, we have to check again by peer.address
            // as the Relationship could have been created before the peerAddress was introduced
            const query = { [`${nameof<Relationship>((r) => r.peer)}.${nameof<Identity>((r) => r.address)}`]: address.toString() };
            if (status) query[`${nameof<Relationship>((r) => r.status)}`] = status;
            relationshipDoc = await this.relationships.findOne(query);
        }

        if (!relationshipDoc) {
            return;
        }

        const relationship = Relationship.from(relationshipDoc);
        if (withAuditLog) {
            await this.addAuditLog(relationship);
        }

        return relationship;
    }

    public async getActiveRelationshipToIdentity(address: CoreAddress, withAuditLog?: boolean): Promise<Relationship | undefined> {
        return await this.getRelationshipToIdentity(address, RelationshipStatus.Active, withAuditLog);
    }

    public async getRelationship(id: CoreId, withAuditLog?: boolean): Promise<Relationship | undefined> {
        const relationshipDoc = await this.relationships.read(id.toString());
        if (!relationshipDoc) {
            return;
        }

        const relationship = Relationship.from(relationshipDoc);
        if (withAuditLog) {
            await this.addAuditLog(relationship);
        }

        return relationship;
    }

    private async getAuditLog(id: CoreId): Promise<IAuditLog> {
        const backboneAuditLog = (await this.client.getRelationship(id.toString())).value.auditLog;
        const auditLog: IAuditLog = [];
        backboneAuditLog.forEach((entry) => {
            auditLog.push({ ...entry, createdAt: CoreDate.from(entry.createdAt), createdBy: CoreAddress.from(entry.createdBy) });
        }); // TODO: error handling
        return auditLog;
    }

    private async addAuditLog(relationship: Relationship): Promise<void> {
        relationship.auditLog = await this.getAuditLog(relationship.id);
    }

    public async sign(relationship: Relationship, content: CoreBuffer): Promise<CryptoSignature> {
        return await this.secrets.sign(relationship.relationshipSecretId, content);
    }

    public async verify(relationship: Relationship, content: CoreBuffer, signature: CryptoSignature): Promise<boolean> {
        return await this.secrets.verifyPeer(relationship.relationshipSecretId, content, signature);
    }

    public async verifyIdentity(relationship: Relationship, content: CoreBuffer, signature: CryptoSignature): Promise<boolean> {
        return await CoreCrypto.verify(content, signature, relationship.peer.publicKey);
    }

    public async sendRelationship(parameters: ISendRelationshipParameters): Promise<Relationship> {
        parameters = SendRelationshipParameters.from(parameters);
        const template = (parameters as SendRelationshipParameters).template;
        if (!template.cache) {
            throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        }

        const secretId = await TransportIds.relationshipSecret.generate();

        const requestCipher = await this.prepareRequest(secretId, template, parameters.content);

        const backboneResponse = (
            await this.client.createRelationship({
                content: requestCipher.toBase64(),
                relationshipTemplateId: template.id.toString()
            })
        ).value;

        const newRelationship = Relationship.fromRequestSent(
            CoreId.from(backboneResponse.id),
            template,
            template.cache.identity,
            backboneResponse.creationContent,

            secretId
        );

        await this.relationships.create(newRelationship);

        this.eventBus.publish(new RelationshipChangedEvent(this.parent.identity.address.toString(), newRelationship));

        return newRelationship;
    }

    @log()
    public async setRelationshipMetadata(idOrRelationship: CoreId | Relationship, metadata: ISerializable): Promise<Relationship> {
        const id = idOrRelationship instanceof CoreId ? idOrRelationship.toString() : idOrRelationship.id.toString();
        const relationshipDoc = await this.relationships.read(id);
        if (!relationshipDoc) throw CoreErrors.general.recordNotFound(Relationship, id.toString());

        const relationship = Relationship.from(relationshipDoc);
        relationship.metadata = metadata;
        relationship.metadataModifiedAt = CoreDate.utc();
        await this.relationships.update(relationshipDoc, relationship);

        return relationship;
    }

    public async accept(relationshipId: CoreId): Promise<Relationship> {
        const relationshipStatus = (await this.getRelationship(relationshipId))!.status;
        if (relationshipStatus !== RelationshipStatus.Pending) {
            throw CoreErrors.relationships.wrongRelationshipStatus(relationshipStatus);
        }
        return await this.completeStateTransition(RelationshipStatus.Active, relationshipId);
    }

    public async reject(relationshipId: CoreId): Promise<Relationship> {
        const relationshipStatus = (await this.getRelationship(relationshipId))!.status;
        if (relationshipStatus !== RelationshipStatus.Pending) {
            throw CoreErrors.relationships.wrongRelationshipStatus(relationshipStatus);
        }
        return await this.completeStateTransition(RelationshipStatus.Rejected, relationshipId);
    }

    public async revoke(relationshipId: CoreId): Promise<Relationship> {
        const relationshipStatus = (await this.getRelationship(relationshipId))!.status;
        if (relationshipStatus !== RelationshipStatus.Pending) {
            throw CoreErrors.relationships.wrongRelationshipStatus(relationshipStatus);
        }
        return await this.completeStateTransition(RelationshipStatus.Revoked, relationshipId);
    }

    private async updateCacheOfRelationship(relationship: Relationship, response?: BackboneGetRelationshipsResponse) {
        if (!response) {
            response = (await this.client.getRelationship(relationship.id.toString())).value;
        }

        const cachedRelationship = await this.decryptRelationship(response, relationship.relationshipSecretId);

        relationship.setCache(cachedRelationship);
    }

    private async decryptRelationship(response: BackboneGetRelationshipsResponse, relationshipSecretId: CoreId) {
        const templateId = CoreId.from(response.relationshipTemplateId);

        this._log.trace(`Parsing relationship template ${templateId} for ${response.id}...`);
        const template = await this.parent.relationshipTemplates.getRelationshipTemplate(templateId);
        if (!template) {
            throw CoreErrors.general.recordNotFound(RelationshipTemplate, templateId.toString());
        }

        this._log.trace(`Parsing relationship creation content of ${response.id}...`);

        const creationContent = this.decryptCreationContent(response.creationContent, CoreAddress.from(response.to), relationshipSecretId);
        const cachedRelationship = CachedRelationship.from({
            creationContent,
            template: template
        });

        return cachedRelationship;
    }

    private async prepareRequest(relationshipSecretId: CoreId, template: RelationshipTemplate, content: ISerializable): Promise<RelationshipCreationRequestCipher> {
        if (!template.cache) {
            throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        }

        const requestPublic = await this.secrets.createRequestorSecrets(template.cache, relationshipSecretId);

        const requestContent: RelationshipCreationRequestContentWrapper = RelationshipCreationRequestContentWrapper.from({
            content: content,
            identity: this.parent.identity.identity,
            templateId: template.id
        });
        const serializedRequest = requestContent.serialize();
        const buffer = CoreUtil.toBuffer(serializedRequest);

        const [deviceSignature, relationshipSignature] = await Promise.all([this.parent.activeDevice.sign(buffer), this.secrets.sign(relationshipSecretId, buffer)]);

        const signedRequest = RelationshipCreationRequestSigned.from({
            serializedRequest: serializedRequest,
            deviceSignature: deviceSignature,
            relationshipSignature: relationshipSignature
        });

        const cipher = await this.secrets.encryptRequest(relationshipSecretId, signedRequest);
        const requestCipher = RelationshipCreationRequestCipher.from({
            cipher: cipher,
            publicRequestCrypto: requestPublic
        });

        return requestCipher;
    }

    public async applyIncomingCreation(relationshipId: string): Promise<Relationship | undefined> {
        const relationshipDoc = await this.relationships.read(relationshipId);
        if (relationshipDoc) {
            // If we have a relationship already but no response, do nothing
            return undefined;
        }

        const newRelationship = await this.createNewRelationshipByIncomingCreation(relationshipId);
        return newRelationship;
    }

    @log()
    private async decryptCreationContent(creationContent: string, creationContentCreator: CoreAddress, secretId: CoreId): Promise<any> {
        const isOwnContent = this.parent.identity.isMe(creationContentCreator);

        const requestCipher = RelationshipCreationRequestCipher.fromBase64(creationContent);
        const signedRequestBuffer = await this.secrets.decryptRequest(secretId, requestCipher.cipher);
        const signedRequest = RelationshipCreationRequestSigned.deserialize(signedRequestBuffer.toUtf8());

        let relationshipSignatureValid;
        if (isOwnContent) {
            relationshipSignatureValid = await this.secrets.verifyOwn(secretId, CoreBuffer.fromUtf8(signedRequest.serializedRequest), signedRequest.relationshipSignature);
        } else {
            relationshipSignatureValid = await this.secrets.verifyPeer(secretId, CoreBuffer.fromUtf8(signedRequest.serializedRequest), signedRequest.relationshipSignature);
        }

        if (!relationshipSignatureValid) {
            throw CoreErrors.general.signatureNotValid("relationshipRequest");
        }

        const requestContent = RelationshipCreationRequestContentWrapper.deserialize(signedRequest.serializedRequest);

        return requestContent;
    }

    @log()
    private async createNewRelationshipByIncomingCreation(relationshipId: string): Promise<Relationship> {
        const backboneRelationship = (await this.client.getRelationship(relationshipId)).value;

        const templateId = CoreId.from(backboneRelationship.relationshipTemplateId);
        const template = await this.parent.relationshipTemplates.getRelationshipTemplate(templateId);

        if (!template) throw CoreErrors.general.recordNotFound(RelationshipTemplate, templateId.toString());
        if (!template.cache) throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());

        const secretId = await TransportIds.relationshipSecret.generate();
        const requestCipher = RelationshipCreationRequestCipher.fromBase64(backboneRelationship.creationContent);
        await this.secrets.createTemplatorSecrets(secretId, template.cache, requestCipher.publicRequestCrypto);

        const requestContent = await this.decryptCreationContent(backboneRelationship.creationContent, CoreAddress.from(backboneRelationship.to), secretId);
        // TODO: transform peer identity from string to identity
        const relationship = Relationship.fromCreationContentReceived(backboneRelationship, template, requestContent.identity, requestContent, secretId);

        await this.relationships.create(relationship);
        return relationship;
    }

    @log()
    private async completeStateTransition(targetStatus: RelationshipStatus, id: CoreId) {
        const relationshipDoc = await this.relationships.read(id.toString());
        if (!relationshipDoc) {
            throw CoreErrors.general.recordNotFound(Relationship, id.toString());
        }

        const relationship = Relationship.from(relationshipDoc);

        if (!relationship.cache) {
            await this.updateCacheOfRelationship(relationship);
        }

        if (!relationship.cache) {
            throw this.newCacheEmptyError(Relationship, id.toString());
        }

        let backboneResponse: BackboneGetRelationshipsResponse;
        switch (targetStatus) {
            case RelationshipStatus.Active:
                backboneResponse = (await this.client.acceptRelationship(id.toString())).value;
                break;

            case RelationshipStatus.Rejected:
                backboneResponse = (await this.client.rejectRelationship(id.toString())).value;
                break;

            case RelationshipStatus.Revoked:
                backboneResponse = (await this.client.revokeRelationship(id.toString())).value;
                break;

            default:
                throw new TransportError("target change status not supported");
        }
        relationship.status = backboneResponse.status;

        await this.relationships.update(relationshipDoc, relationship);

        this.eventBus.publish(new RelationshipChangedEvent(this.parent.identity.address.toString(), relationship));

        return relationship;
    }
}
