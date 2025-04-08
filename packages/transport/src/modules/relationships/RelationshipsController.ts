import { ISerializable } from "@js-soft/ts-serval";
import { log, Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreError, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSignature } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { ControllerName, CoreCrypto, TransportController, TransportError } from "../../core";
import { CoreUtil } from "../../core/CoreUtil";
import { DbCollectionName } from "../../core/DbCollectionName";
import { TransportCoreErrors } from "../../core/TransportCoreErrors";
import { TransportIds } from "../../core/TransportIds";
import { RelationshipChangedEvent, RelationshipDecomposedBySelfEvent, RelationshipReactivationCompletedEvent, RelationshipReactivationRequestedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { RelationshipTemplate } from "../relationshipTemplates/local/RelationshipTemplate";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { RelationshipSecretController } from "./RelationshipSecretController";
import { BackbonePutRelationshipsResponse } from "./backbone/BackbonePutRelationship";
import { BackboneRelationship } from "./backbone/BackboneRelationship";
import { RelationshipClient } from "./backbone/RelationshipClient";
import { CachedRelationship } from "./local/CachedRelationship";
import { PeerDeletionInfo } from "./local/PeerDeletionInfo";
import { Relationship } from "./local/Relationship";
import { RelationshipAuditLog } from "./local/RelationshipAuditLog";
import { ISendRelationshipParameters, SendRelationshipParameters } from "./local/SendRelationshipParameters";
import { RelationshipAuditLogEntryReason } from "./transmission/RelationshipAuditLog";
import { RelationshipStatus } from "./transmission/RelationshipStatus";
import { RelationshipCreationContentCipher } from "./transmission/requests/RelationshipCreationContentCipher";
import { RelationshipCreationContentSigned } from "./transmission/requests/RelationshipCreationContentSigned";
import { RelationshipCreationContentWrapper } from "./transmission/requests/RelationshipCreationContentWrapper";
import { RelationshipCreationResponseContentCipher } from "./transmission/responses/RelationshipCreationResponseContentCipher";
import { RelationshipCreationResponseContentSigned } from "./transmission/responses/RelationshipCreationResponseContentSigned";
import { RelationshipCreationResponseContentWrapper } from "./transmission/responses/RelationshipCreationResponseContentWrapper";

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

        this.client = new RelationshipClient(this.config, this.parent.authenticator, this.transport.correlator);
        this.relationships = await this.parent.getSynchronizedCollection(DbCollectionName.Relationships);

        return this;
    }

    public async getRelationships(query?: any): Promise<Relationship[]> {
        const relationshipDocs = await this.relationships.find(query);
        const relationships = this.parseArray<Relationship>(relationshipDocs, Relationship);

        return relationships;
    }

    public async updateCache(ids: string[]): Promise<Relationship[]> {
        if (ids.length < 1) {
            return [];
        }

        const resultItems = (await this.client.getRelationships({ ids })).value;
        const promises = [];
        for await (const resultItem of resultItems) {
            promises.push(this.updateExistingRelationshipInDb(resultItem.id, resultItem));
        }
        return await Promise.all(promises);
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedRelationship }[]> {
        if (ids.length === 0) return [];

        const backboneRelationships = await (await this.client.getRelationships({ ids: ids.map((id) => id.id) })).value.collect();

        const decryptionPromises = backboneRelationships.map(async (r) => {
            const relationshipDoc = await this.relationships.read(r.id);
            if (!relationshipDoc) {
                this._log.error(
                    `Relationship '${r.id}' not found in local database and the cache fetching was therefore skipped. This should not happen and might be a bug in the application logic.`
                );
                return;
            }

            const relationship = Relationship.from(relationshipDoc);

            return {
                id: CoreId.from(r.id),
                cache: await this.decryptRelationship(r, relationship.relationshipSecretId)
            };
        });

        const caches = await Promise.all(decryptionPromises);
        return caches.filter((c) => c !== undefined);
    }

    @log()
    private async updateExistingRelationshipInDb(id: string, response: BackboneRelationship) {
        const relationshipDoc = await this.relationships.read(id);
        if (!relationshipDoc) throw TransportCoreErrors.general.recordNotFound(Relationship, id);

        const relationship = Relationship.from(relationshipDoc);

        await this.updateCacheOfRelationship(relationship, response);
        relationship.status = response.status;
        await this.relationships.update(relationshipDoc, relationship);
        return relationship;
    }

    public async getRelationshipToIdentity(address: CoreAddress, status?: RelationshipStatus): Promise<Relationship | undefined> {
        const query: any = { peerAddress: address.toString() };
        if (status) query[`${nameof<Relationship>((r) => r.status)}`] = status;
        const relationships = await this.relationships.find(query);

        if (relationships.length === 0) return undefined;
        if (relationships.length === 1) return Relationship.from(relationships[0]);

        const newestRelationship = relationships.reduce((prev, current) => {
            return prev.createdAt > current.createdAt ? prev : current;
        });

        return Relationship.from(newestRelationship);
    }

    public async getActiveRelationshipToIdentity(address: CoreAddress): Promise<Relationship | undefined> {
        return await this.getRelationshipToIdentity(address, RelationshipStatus.Active);
    }

    public async getRelationship(id: CoreId): Promise<Relationship | undefined> {
        const relationshipDoc = await this.relationships.read(id.toString());
        if (!relationshipDoc) {
            return;
        }

        const relationship = Relationship.from(relationshipDoc);

        return relationship;
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
        const canSendRelationship = await this.canSendRelationship(parameters);

        if (!canSendRelationship.isSuccess) {
            throw canSendRelationship.error;
        }

        const template = (parameters as SendRelationshipParameters).template;
        if (!template.cache) {
            throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        }

        const secretId = await TransportIds.relationshipSecret.generate();
        const creationContentCipher = await this.prepareCreationContent(secretId, template, parameters.creationContent);

        const result = await this.client.createRelationship({
            creationContent: creationContentCipher.toBase64(),
            relationshipTemplateId: template.id.toString()
        });
        if (result.isError) throw result.error;

        const backboneResponse = result.value;

        const newRelationship = Relationship.fromBackboneAndCreationContent(backboneResponse, template.cache.identity, parameters.creationContent, secretId);

        await this.relationships.create(newRelationship);

        this.eventBus.publish(new RelationshipChangedEvent(this.parent.identity.address.toString(), newRelationship));

        return newRelationship;
    }

    public async canSendRelationship(parameters: ISendRelationshipParameters): Promise<Result<void, CoreError>> {
        const template = (parameters as SendRelationshipParameters).template;
        if (!template.cache) {
            throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        }

        const peerAddress = template.cache.createdBy;
        const existingRelationshipToPeer = await this.getExistingRelationshipToIdentity(peerAddress);

        if (existingRelationshipToPeer) {
            return Result.fail(TransportCoreErrors.relationships.relationshipCurrentlyExists(existingRelationshipToPeer.status));
        }

        if (template.isExpired()) {
            return Result.fail(TransportCoreErrors.relationships.relationshipTemplateIsExpired(template.id.toString()));
        }

        const result = await this.client.canCreateRelationship(peerAddress.toString());

        if (result.isError && result.error.code === "error.platform.recordNotFound" && result.error.message.includes("Identity not found.")) {
            return Result.fail(TransportCoreErrors.relationships.deletedOwnerOfRelationshipTemplate());
        }

        if (!result.value.canCreate) {
            if (result.value.code === "error.platform.validation.relationship.relationshipToTargetAlreadyExists") {
                return Result.fail(TransportCoreErrors.relationships.relationshipNotYetDecomposedByPeer());
            }

            if (result.value.code === "error.platform.validation.relationship.peerIsToBeDeleted") {
                return Result.fail(TransportCoreErrors.relationships.activeIdentityDeletionProcessOfOwnerOfRelationshipTemplate());
            }

            return Result.fail(new CoreError(result.error.code));
        }

        return Result.ok(undefined);
    }

    public async getExistingRelationshipToIdentity(address: CoreAddress): Promise<Relationship | undefined> {
        const queryForExistingRelationships = {
            "peer.address": address.toString(),
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
        };

        const existingRelationshipsToIdentity = await this.getRelationships(queryForExistingRelationships);

        return existingRelationshipsToIdentity.length === 0 ? undefined : existingRelationshipsToIdentity[0];
    }

    @log()
    public async setRelationshipMetadata(idOrRelationship: CoreId | Relationship, metadata: ISerializable): Promise<Relationship> {
        const id = idOrRelationship instanceof CoreId ? idOrRelationship.toString() : idOrRelationship.id.toString();
        const relationshipDoc = await this.relationships.read(id);
        if (!relationshipDoc) throw TransportCoreErrors.general.recordNotFound(Relationship, id.toString());

        const relationship = Relationship.from(relationshipDoc);
        relationship.metadata = metadata;
        relationship.metadataModifiedAt = CoreDate.utc();
        await this.relationships.update(relationshipDoc, relationship);

        return relationship;
    }

    public async accept(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Pending);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (!lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
            throw TransportCoreErrors.relationships.operationOnlyAllowedForPeer(`Only your peer can accept the relationship ${relationshipId.toString()}`);
        }
        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.AcceptanceOfCreation, relationshipId);
    }

    public async reject(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Pending);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (!lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
            throw TransportCoreErrors.relationships.operationOnlyAllowedForPeer(
                `Only your peer can reject the relationship ${relationshipId.toString()}. Revoke the relationship instead.`
            );
        }
        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.RejectionOfCreation, relationshipId);
    }

    public async revoke(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Pending);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
            throw TransportCoreErrors.relationships.operationOnlyAllowedForPeer(
                `Only your peer can revoke the relationship ${relationshipId.toString()}. Reject the relationship instead.`
            );
        }
        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.RevocationOfCreation, relationshipId);
    }

    public async terminate(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Active);

        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.Termination, relationshipId);
    }

    public async requestReactivation(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Terminated);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (lastAuditLogEntry.reason === RelationshipAuditLogEntryReason.ReactivationRequested) {
            if (lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
                throw TransportCoreErrors.relationships.reactivationAlreadyRequested(
                    `Your peer has already requested the reactivation of the relationship ${relationshipId.toString()}. You can accept the reactivation instead.`
                );
            }
            throw TransportCoreErrors.relationships.reactivationAlreadyRequested(`You have already requested the reactivation of the relationship ${relationshipId.toString()}.`);
        }

        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.ReactivationRequested, relationshipId);
    }

    public async rejectReactivation(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Terminated);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (lastAuditLogEntry.reason !== RelationshipAuditLogEntryReason.ReactivationRequested) {
            throw TransportCoreErrors.relationships.reactivationNotRequested(relationshipId.toString());
        }

        if (!lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
            throw TransportCoreErrors.relationships.operationOnlyAllowedForPeer(
                `Only your peer can reject the reactivation of the relationship ${relationshipId.toString()}. Revoke the relationship reactivation instead.`
            );
        }
        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.RejectionOfReactivation, relationshipId);
    }

    public async revokeReactivation(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Terminated);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (lastAuditLogEntry.reason !== RelationshipAuditLogEntryReason.ReactivationRequested) {
            throw TransportCoreErrors.relationships.reactivationNotRequested(relationshipId.toString());
        }
        if (lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
            throw TransportCoreErrors.relationships.operationOnlyAllowedForPeer(
                `Only your peer can revoke the reactivation of the relationship ${relationshipId.toString()}. Reject the relationship reactivation instead.`
            );
        }
        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.RevocationOfReactivation, relationshipId);
    }

    public async acceptReactivation(relationshipId: CoreId): Promise<Relationship> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Terminated);

        const lastAuditLogEntry = relationship.cache.auditLog[relationship.cache.auditLog.length - 1];
        if (lastAuditLogEntry.reason !== RelationshipAuditLogEntryReason.ReactivationRequested) {
            throw TransportCoreErrors.relationships.reactivationNotRequested(relationshipId.toString());
        }
        if (!lastAuditLogEntry.createdBy.equals(relationship.peer.address)) {
            throw TransportCoreErrors.relationships.operationOnlyAllowedForPeer(`Only your peer can accept the reactivation of the relationship ${relationshipId.toString()}.`);
        }

        return await this.completeOperationWithBackboneCall(RelationshipAuditLogEntryReason.AcceptanceOfReactivation, relationshipId);
    }

    public async decompose(relationshipId: CoreId): Promise<void> {
        const relationship = await this.getRelationshipWithCache(relationshipId);
        this.assertRelationshipStatus(relationship, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed);

        const result = await this.client.decomposeRelationship(relationshipId.toString());
        if (result.isError) throw result.error;

        const isSecretDeletionSuccessful = await this.secrets.deleteSecretForRelationship(relationship.relationshipSecretId);
        if (!isSecretDeletionSuccessful) {
            this._log.error("Decomposition failed to delete secrets");
        }
        await this.relationships.delete({ id: relationshipId });

        this.eventBus.publish(new RelationshipDecomposedBySelfEvent(this.parent.identity.address.toString(), { relationshipId }));
    }

    private async getRelationshipWithCache(id: CoreId): Promise<Relationship & { cache: CachedRelationship }> {
        const relationship = await this.getRelationship(id);
        if (!relationship) throw TransportCoreErrors.general.recordNotFound(Relationship, id.toString());
        if (!relationship.cache) await this.updateCacheOfRelationship(relationship);
        if (!relationship.cache) throw this.newCacheEmptyError(Relationship, id.toString());

        return relationship as Relationship & { cache: CachedRelationship };
    }

    private assertRelationshipStatus(relationship: Relationship, ...status: RelationshipStatus[]) {
        if (status.includes(relationship.status)) return;

        throw TransportCoreErrors.relationships.wrongRelationshipStatus(relationship.id.toString(), relationship.status);
    }

    private async updateCacheOfRelationship(relationship: Relationship, response?: BackboneRelationship) {
        if (!response) {
            response = (await this.client.getRelationship(relationship.id.toString())).value;
        }

        const cachedRelationship = await this.decryptRelationship(response, relationship.relationshipSecretId);

        relationship.setCache(cachedRelationship);
    }

    private async decryptRelationship(response: BackboneRelationship, relationshipSecretId: CoreId) {
        if (!response.creationContent) throw new TransportError("Creation content is missing");

        const templateId = CoreId.from(response.relationshipTemplateId);

        this._log.trace(`Parsing relationship creation content of ${response.id}...`);

        const creationContent = await this.decryptCreationContent(response.creationContent, CoreAddress.from(response.from), relationshipSecretId);

        const cachedRelationship = CachedRelationship.from({
            creationContent: creationContent.content,
            templateId,
            auditLog: RelationshipAuditLog.fromBackboneAuditLog(response.auditLog)
        });

        return cachedRelationship;
    }

    private async prepareCreationContent(relationshipSecretId: CoreId, template: RelationshipTemplate, content: ISerializable): Promise<RelationshipCreationContentCipher> {
        if (!template.cache) {
            throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        }

        const publicCreationContentCrypto = await this.secrets.createRequestorSecrets(template.cache, relationshipSecretId);

        const creationContent: RelationshipCreationContentWrapper = RelationshipCreationContentWrapper.from({
            content,
            identity: this.parent.identity.identity,
            templateId: template.id
        });
        const serializedCreationContent = creationContent.serialize();
        const buffer = CoreUtil.toBuffer(serializedCreationContent);

        const [deviceSignature, relationshipSignature] = await Promise.all([this.parent.activeDevice.sign(buffer), this.secrets.sign(relationshipSecretId, buffer)]);

        const signedCreationContent = RelationshipCreationContentSigned.from({
            serializedCreationContent,
            deviceSignature,
            relationshipSignature
        });

        const cipher = await this.secrets.encryptCreationContent(relationshipSecretId, signedCreationContent);
        const creationContentCipher = RelationshipCreationContentCipher.from({
            cipher,
            publicCreationContentCrypto
        });

        return creationContentCipher;
    }

    @log()
    private async updateRelationshipWithPeerResponse(relationshipDoc: any): Promise<Relationship> {
        const relationship = Relationship.from(relationshipDoc);

        const backboneRelationship = (await this.client.getRelationship(relationship.id.toString())).value;

        if (!(await this.secrets.hasCryptoRelationshipSecrets(relationship.relationshipSecretId)) && backboneRelationship.creationResponseContent) {
            const creationResponseContent = backboneRelationship.creationResponseContent;
            const cipher = RelationshipCreationResponseContentCipher.fromBase64(creationResponseContent);

            await this.secrets.convertSecrets(relationship.relationshipSecretId, cipher.publicCreationResponseContentCrypto);
        }
        relationship.cache!.auditLog = RelationshipAuditLog.fromBackboneAuditLog(backboneRelationship.auditLog);
        relationship.status = backboneRelationship.status;

        await this.relationships.update(relationshipDoc, relationship);
        return relationship;
    }

    @log()
    private async decryptCreationContent(backboneCreationContent: string, creationContentCreator: CoreAddress, secretId: CoreId): Promise<RelationshipCreationContentWrapper> {
        const isOwnContent = this.parent.identity.isMe(creationContentCreator);

        const creationContentCipher = RelationshipCreationContentCipher.fromBase64(backboneCreationContent);
        const signedCreationContentBuffer = await this.secrets.decryptCreationContent(secretId, creationContentCipher.cipher);
        const signedCreationContent = RelationshipCreationContentSigned.deserialize(signedCreationContentBuffer.toUtf8());

        let relationshipSignatureValid;
        if (isOwnContent) {
            relationshipSignatureValid = await this.secrets.verifyOwn(
                secretId,
                CoreBuffer.fromUtf8(signedCreationContent.serializedCreationContent),
                signedCreationContent.relationshipSignature
            );
        } else {
            relationshipSignatureValid = await this.secrets.verifyPeer(
                secretId,
                CoreBuffer.fromUtf8(signedCreationContent.serializedCreationContent),
                signedCreationContent.relationshipSignature
            );
        }

        if (!relationshipSignatureValid) {
            throw TransportCoreErrors.general.signatureNotValid("relationshipCreationContent");
        }

        const creationContent = RelationshipCreationContentWrapper.deserialize(signedCreationContent.serializedCreationContent);

        return creationContent;
    }

    @log()
    private async createNewRelationshipByIncomingCreation(relationshipId: string): Promise<Relationship | undefined> {
        const backboneRelationshipResponse = await this.client.getRelationship(relationshipId);

        if (backboneRelationshipResponse.isError && backboneRelationshipResponse.error.code === "error.platform.validation.relationship.relationshipAlreadyDecomposed") {
            return undefined;
        }

        const backboneRelationship = backboneRelationshipResponse.value;

        if (!backboneRelationship.creationContent) throw new TransportError("Creation content is missing");

        const templateId = CoreId.from(backboneRelationship.relationshipTemplateId);
        const template = await this.parent.relationshipTemplates.getRelationshipTemplate(templateId);

        if (!template) throw TransportCoreErrors.general.recordNotFound(RelationshipTemplate, templateId.toString());
        if (!template.cache) throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());

        const secretId = await TransportIds.relationshipSecret.generate();
        const creationContentCipher = RelationshipCreationContentCipher.fromBase64(backboneRelationship.creationContent);
        await this.secrets.createTemplatorSecrets(secretId, template.cache, creationContentCipher.publicCreationContentCrypto);

        const creationContent = await this.decryptCreationContent(backboneRelationship.creationContent, CoreAddress.from(backboneRelationship.from), secretId);
        const relationship = Relationship.fromBackboneAndCreationContent(backboneRelationship, creationContent.identity, creationContent.content, secretId);

        await this.relationships.create(relationship);
        return relationship;
    }

    public async applyRelationshipChangedEvent(relationshipId: string): Promise<{ oldRelationship?: Relationship; changedRelationship?: Relationship }> {
        const relationshipDoc = await this.relationships.read(relationshipId);
        if (!relationshipDoc) {
            const changedRelationship = await this.createNewRelationshipByIncomingCreation(relationshipId);

            if (changedRelationship === undefined) return { changedRelationship: undefined };

            if (changedRelationship.status === RelationshipStatus.Pending) return { changedRelationship };

            const relationshipDoc = await this.relationships.read(relationshipId);
            const updatedRelationship = await this.updateRelationshipWithPeerResponse(relationshipDoc);
            return { changedRelationship: updatedRelationship };
        }

        const oldRelationship = Relationship.from(relationshipDoc);
        const changedRelationship = await this.updateRelationshipWithPeerResponse(relationshipDoc);

        return { oldRelationship, changedRelationship };
    }

    private async prepareCreationResponseContent(relationship: Relationship) {
        const publicCreationResponseContentCrypto = await this.secrets.getPublicCreationResponseContentCrypto(relationship.relationshipSecretId);

        const creationResponseContent = RelationshipCreationResponseContentWrapper.from({ relationshipId: relationship.id });

        const serializedCreationResponseContent = creationResponseContent.serialize();
        const buffer = CoreUtil.toBuffer(serializedCreationResponseContent);

        const [deviceSignature, relationshipSignature] = await Promise.all([this.parent.activeDevice.sign(buffer), this.secrets.sign(relationship.relationshipSecretId, buffer)]);

        const signedCreationResponseContent = RelationshipCreationResponseContentSigned.from({
            serializedCreationResponseContent,
            deviceSignature,
            relationshipSignature
        });

        const cipher = await this.secrets.encrypt(relationship.relationshipSecretId, signedCreationResponseContent);
        const creationResponseContentCipher = RelationshipCreationResponseContentCipher.from({
            cipher,
            publicCreationResponseContentCrypto
        });

        return creationResponseContentCipher.toBase64();
    }

    @log()
    private async completeOperationWithBackboneCall(operation: RelationshipAuditLogEntryReason, id: CoreId) {
        const relationshipDoc = await this.relationships.read(id.toString());
        if (!relationshipDoc) {
            throw TransportCoreErrors.general.recordNotFound(Relationship, id.toString());
        }

        const relationship = Relationship.from(relationshipDoc);

        if (!relationship.cache) {
            await this.updateCacheOfRelationship(relationship);
        }

        if (!relationship.cache) {
            throw this.newCacheEmptyError(Relationship, id.toString());
        }

        let backboneResponse: BackbonePutRelationshipsResponse;
        switch (operation) {
            case RelationshipAuditLogEntryReason.AcceptanceOfCreation:
                const encryptedContent = await this.prepareCreationResponseContent(relationship);

                backboneResponse = (await this.client.acceptRelationship(id.toString(), { creationResponseContent: encryptedContent })).value;
                break;

            case RelationshipAuditLogEntryReason.RejectionOfCreation:
                backboneResponse = (await this.client.rejectRelationship(id.toString())).value;
                break;

            case RelationshipAuditLogEntryReason.RevocationOfCreation:
                backboneResponse = (await this.client.revokeRelationship(id.toString())).value;
                break;

            case RelationshipAuditLogEntryReason.Termination:
                backboneResponse = (await this.client.terminateRelationship(id.toString())).value;
                break;

            case RelationshipAuditLogEntryReason.ReactivationRequested:
                backboneResponse = (await this.client.reactivateRelationship(id.toString())).value;
                break;

            case RelationshipAuditLogEntryReason.AcceptanceOfReactivation:
                backboneResponse = (await this.client.acceptRelationshipReactivation(id.toString())).value;
                break;

            case RelationshipAuditLogEntryReason.RejectionOfReactivation:
                backboneResponse = (await this.client.rejectRelationshipReactivation(id.toString())).value;
                break;

            case RelationshipAuditLogEntryReason.RevocationOfReactivation:
                backboneResponse = (await this.client.revokeRelationshipReactivation(id.toString())).value;
                break;

            default:
                throw new TransportError("operation not supported");
        }
        relationship.status = backboneResponse.status;
        relationship.cache.auditLog = RelationshipAuditLog.fromBackboneAuditLog(backboneResponse.auditLog);

        await this.relationships.update(relationshipDoc, relationship);
        this.publishEventAfterCompletedOperation(operation, relationship);
        return relationship;
    }

    private publishEventAfterCompletedOperation(operation: RelationshipAuditLogEntryReason, relationship: Relationship) {
        this.eventBus.publish(new RelationshipChangedEvent(this.parent.identity.address.toString(), relationship));
        switch (operation) {
            case RelationshipAuditLogEntryReason.ReactivationRequested:
                this.eventBus.publish(new RelationshipReactivationRequestedEvent(this.parent.identity.address.toString(), relationship));
                break;
            case RelationshipAuditLogEntryReason.RevocationOfReactivation:
            case RelationshipAuditLogEntryReason.AcceptanceOfReactivation:
            case RelationshipAuditLogEntryReason.RejectionOfReactivation:
                this.eventBus.publish(new RelationshipReactivationCompletedEvent(this.parent.identity.address.toString(), relationship));
                break;
            default:
        }
    }

    public async setPeerDeletionInfo(relationshipId: CoreId, deletionInfo?: PeerDeletionInfo): Promise<Relationship> {
        const relationshipDoc = await this.relationships.read(relationshipId.toString());
        if (!relationshipDoc) throw TransportCoreErrors.general.recordNotFound(Relationship, relationshipId.toString());

        const relationship = Relationship.from(relationshipDoc);
        relationship.peerDeletionInfo = deletionInfo;
        await this.relationships.update(relationshipDoc, relationship);

        return relationship;
    }
}
