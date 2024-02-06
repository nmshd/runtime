import { ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreBuffer, CryptoSignature } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { ControllerName, CoreAddress, CoreCrypto, CoreDate, CoreId, ICoreSerializable, TransportController, TransportError } from "../../core";
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
import { BackboneGetRelationshipsChangesResponse, BackboneGetRelationshipsChangesSingleChangeResponse } from "./backbone/BackboneGetRelationshipsChanges";
import { RelationshipClient } from "./backbone/RelationshipClient";
import { CachedRelationship } from "./local/CachedRelationship";
import { Relationship } from "./local/Relationship";
import { ISendRelationshipParameters, SendRelationshipParameters } from "./local/SendRelationshipParameters";
import { RelationshipSecretController } from "./RelationshipSecretController";
import { RelationshipChange } from "./transmission/changes/RelationshipChange";
import { RelationshipChangeResponse } from "./transmission/changes/RelationshipChangeResponse";
import { RelationshipChangeStatus } from "./transmission/changes/RelationshipChangeStatus";
import { RelationshipChangeType } from "./transmission/changes/RelationshipChangeType";
import { RelationshipStatus } from "./transmission/RelationshipStatus";
import { RelationshipCreationChangeRequestCipher } from "./transmission/requests/RelationshipCreationChangeRequestCipher";
import { RelationshipCreationChangeRequestContentWrapper } from "./transmission/requests/RelationshipCreationChangeRequestContentWrapper";
import { RelationshipCreationChangeRequestSigned } from "./transmission/requests/RelationshipCreationChangeRequestSigned";
import { RelationshipCreationChangeResponseCipher } from "./transmission/responses/RelationshipCreationChangeResponseCipher";
import { RelationshipCreationChangeResponseContentWrapper } from "./transmission/responses/RelationshipCreationChangeResponseContentWrapper";
import { RelationshipCreationChangeResponseSigned } from "./transmission/responses/RelationshipCreationChangeResponseSigned";

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

    public async getRelationships(query?: any): Promise<Relationship[]> {
        const relationshipDocs = await this.relationships.find(query);
        return this.parseArray<Relationship>(relationshipDocs, Relationship);
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

    public async getRelationshipToIdentity(address: CoreAddress, status?: RelationshipStatus): Promise<Relationship | undefined> {
        const simpleQuery: any = { peerAddress: address.toString() };
        const dotNotationQuery: any = { [`${nameof<Relationship>((r) => r.peer)}.${nameof<Identity>((r) => r.address)}`]: address.toString() };

        if (status) {
            simpleQuery[`${nameof<Relationship>((r) => r.status)}`] = status;
            dotNotationQuery[`${nameof<Relationship>((r) => r.status)}`] = status;
        }

        let relationshipDoc = await this.relationships.findOne(simpleQuery);

        if (!relationshipDoc) {
            relationshipDoc = await this.relationships.findOne(dotNotationQuery);
        }

        if (!relationshipDoc) {
            return;
        }

        return Relationship.from(relationshipDoc);
    }

    public async getActiveRelationshipToIdentity(address: CoreAddress): Promise<Relationship | undefined> {
        return await this.getRelationshipToIdentity(address, RelationshipStatus.Active);
    }

    public async getRelationship(id: CoreId): Promise<Relationship | undefined> {
        const relationshipDoc = await this.relationships.read(id.toString());
        if (!relationshipDoc) {
            return;
        }

        return Relationship.from(relationshipDoc);
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

        const { requestCipher, requestContent } = await this.prepareRequest(secretId, template, parameters.content);

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
            RelationshipChange.fromBackbone(backboneResponse.changes[0], requestContent.content),
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

    public async acceptChange(change: RelationshipChange, content?: ICoreSerializable): Promise<Relationship> {
        return await this.completeChange(RelationshipChangeStatus.Accepted, change, content);
    }

    public async rejectChange(change: RelationshipChange, content?: ICoreSerializable): Promise<Relationship> {
        return await this.completeChange(RelationshipChangeStatus.Rejected, change, content);
    }

    public async revokeChange(change: RelationshipChange, content?: ICoreSerializable): Promise<Relationship> {
        return await this.completeChange(RelationshipChangeStatus.Revoked, change, content);
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

        this._log.trace(`Parsing relationship changes of ${response.id}...`);

        const changesPromises = [];
        for (const change of response.changes) {
            switch (change.type) {
                case RelationshipChangeType.Creation:
                    changesPromises.push(this.parseCreationChange(change, relationshipSecretId, templateId));
                    break;
                default:
                    break;
            }
        }

        const changes = await Promise.all(changesPromises);

        const cachedRelationship = CachedRelationship.from({
            changes: changes,
            template: template
        });

        return cachedRelationship;
    }

    private async prepareRequest(
        relationshipSecretId: CoreId,
        template: RelationshipTemplate,
        content: ISerializable
    ): Promise<{
        requestCipher: RelationshipCreationChangeRequestCipher;
        requestContent: RelationshipCreationChangeRequestContentWrapper;
    }> {
        if (!template.cache) {
            throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        }

        const requestPublic = await this.secrets.createRequestorSecrets(template.cache, relationshipSecretId);

        const requestContent: RelationshipCreationChangeRequestContentWrapper = RelationshipCreationChangeRequestContentWrapper.from({
            content: content,
            identity: this.parent.identity.identity,
            templateId: template.id
        });
        const serializedRequest = requestContent.serialize();
        const buffer = CoreUtil.toBuffer(serializedRequest);

        const [deviceSignature, relationshipSignature] = await Promise.all([this.parent.activeDevice.sign(buffer), this.secrets.sign(relationshipSecretId, buffer)]);

        const signedRequest = RelationshipCreationChangeRequestSigned.from({
            serializedRequest: serializedRequest,
            deviceSignature: deviceSignature,
            relationshipSignature: relationshipSignature
        });

        const cipher = await this.secrets.encryptRequest(relationshipSecretId, signedRequest);
        const requestCipher = RelationshipCreationChangeRequestCipher.from({
            cipher: cipher,
            publicRequestCrypto: requestPublic
        });

        return { requestCipher, requestContent };
    }

    public async applyChangeById(changeId: string): Promise<Relationship | undefined> {
        const relationshipChange = (await this.client.getRelationshipChange(changeId.toString())).value;
        return await this.applyChange(relationshipChange);
    }

    @log()
    public async applyChange(change: BackboneGetRelationshipsChangesResponse): Promise<Relationship | undefined> {
        switch (change.type) {
            case RelationshipChangeType.Creation:
                return await this.applyCreationChange(change);
            case RelationshipChangeType.Termination:
            case RelationshipChangeType.TerminationCancellation:
            default:
                throw CoreErrors.general.notSupported();
        }
    }

    private async applyCreationChange(change: BackboneGetRelationshipsChangesResponse): Promise<Relationship | undefined> {
        const relationshipDoc = await this.relationships.read(change.relationshipId);
        if (relationshipDoc) {
            // Incoming change from sync might still have an empty response
            // This could happen if we've processed the change before (duplicate)
            if (change.response) {
                return await this.updatePendingRelationshipWithPeerResponse(relationshipDoc, change);
            }

            // If we have a relationship already but no response, do nothing
            return undefined;
        }

        const newRelationship = await this.createNewRelationshipByIncomingCreationChange(change);

        if (change.response) {
            // The request was revoked before we fetched the creation,
            // thus the creation and revoke change is one
            const relationshipDoc = await this.relationships.read(change.relationshipId);
            return await this.updatePendingRelationshipWithPeerResponse(relationshipDoc, change);
        }
        return newRelationship;
    }

    @log()
    private async parseCreationChange(change: BackboneGetRelationshipsChangesResponse, relationshipSecretId: CoreId, templateId: CoreId) {
        if (change.type !== RelationshipChangeType.Creation) this.throwWrongChangeType(change.type);

        const promises: any[] = [];
        promises.push(this.decryptCreationChangeRequest(change.request, relationshipSecretId, templateId));

        const hasRelationshipSecret = await this.secrets.hasCryptoRelationshipSecrets(relationshipSecretId);

        if (change.response && hasRelationshipSecret) {
            promises.push(this.decryptCreationChangeResponse(change, relationshipSecretId));
        }

        const [requestContent, responseContent] = await Promise.all(promises);

        const creationChange = RelationshipChange.fromBackbone(change, requestContent.content, responseContent?.content);
        return creationChange;
    }

    @log()
    private async decryptCreationChangeRequest(
        change: BackboneGetRelationshipsChangesSingleChangeResponse,
        secretId: CoreId,
        templateId: CoreId
    ): Promise<RelationshipCreationChangeRequestContentWrapper> {
        if (!change.content) throw this.newEmptyOrInvalidContentError();

        const isOwnChange = this.parent.identity.isMe(CoreAddress.from(change.createdBy));

        const requestCipher = RelationshipCreationChangeRequestCipher.fromBase64(change.content);
        const signedRequestBuffer = await this.secrets.decryptRequest(secretId, requestCipher.cipher);
        const signedRequest = RelationshipCreationChangeRequestSigned.deserialize(signedRequestBuffer.toUtf8());

        let relationshipSignatureValid;
        if (isOwnChange) {
            relationshipSignatureValid = await this.secrets.verifyOwn(secretId, CoreBuffer.fromUtf8(signedRequest.serializedRequest), signedRequest.relationshipSignature);
        } else {
            relationshipSignatureValid = await this.secrets.verifyPeer(secretId, CoreBuffer.fromUtf8(signedRequest.serializedRequest), signedRequest.relationshipSignature);
        }

        if (!relationshipSignatureValid) {
            throw CoreErrors.general.signatureNotValid("relationshipRequest");
        }

        const requestContent = RelationshipCreationChangeRequestContentWrapper.deserialize(signedRequest.serializedRequest);
        if (!requestContent.templateId.equals(templateId)) {
            throw new TransportError("The relationship request contains a wrong template id.");
        }

        return requestContent;
    }

    @log()
    private async decryptCreationChangeResponse(
        change: BackboneGetRelationshipsChangesResponse,
        relationshipSecretId: CoreId
    ): Promise<RelationshipCreationChangeResponseContentWrapper> {
        if (!change.response) throw this.newChangeResponseMissingError(change.id);

        if (change.type !== RelationshipChangeType.Creation) this.throwWrongChangeType(change.type);

        if (!change.response.content) {
            throw this.newEmptyOrInvalidContentError(change);
        }

        const isOwnChange = this.parent.identity.isMe(CoreAddress.from(change.response.createdBy));

        const cipher = RelationshipCreationChangeResponseCipher.fromBase64(change.response.content);
        let signedResponseBuffer;
        if (change.status !== RelationshipChangeStatus.Revoked) {
            if (isOwnChange) {
                signedResponseBuffer = await this.secrets.decryptOwn(relationshipSecretId, cipher.cipher);
            } else {
                signedResponseBuffer = await this.secrets.decryptPeer(relationshipSecretId, cipher.cipher, true);
            }
        } else {
            signedResponseBuffer = await this.secrets.decryptRequest(relationshipSecretId, cipher.cipher);
        }

        const signedResponse = RelationshipCreationChangeResponseSigned.deserialize(signedResponseBuffer.toUtf8());
        let relationshipSignatureValid;
        if (isOwnChange) {
            relationshipSignatureValid = await this.secrets.verifyOwn(
                relationshipSecretId,
                CoreBuffer.fromUtf8(signedResponse.serializedResponse),
                signedResponse.relationshipSignature
            );
        } else {
            relationshipSignatureValid = await this.secrets.verifyPeer(
                relationshipSecretId,
                CoreBuffer.fromUtf8(signedResponse.serializedResponse),
                signedResponse.relationshipSignature
            );
        }

        if (!relationshipSignatureValid) {
            throw CoreErrors.general.signatureNotValid("relationshipResponse");
        }

        const responseContent = RelationshipCreationChangeResponseContentWrapper.deserialize(signedResponse.serializedResponse);

        if (!responseContent.relationshipId.equals(change.relationshipId)) {
            throw new TransportError("The relationship response contains a wrong relationship id.");
        }
        return responseContent;
    }

    @log()
    private async updatePendingRelationshipWithPeerResponse(relationshipDoc: any, change: BackboneGetRelationshipsChangesResponse): Promise<Relationship | undefined> {
        const relationship = Relationship.from(relationshipDoc);

        if (relationship.status !== RelationshipStatus.Pending) {
            this.log.debug("Trying to update non-pending relationship with creation change", change);
            return;
        }

        if (!relationship.cache) {
            await this.updateCacheOfRelationship(relationship, undefined);
        }

        if (!change.response) throw this.newChangeResponseMissingError(change.id);

        if (!change.response.content) {
            throw this.newEmptyOrInvalidContentError(change);
        }

        const cipher = RelationshipCreationChangeResponseCipher.fromBase64(change.response.content);

        if (change.status !== RelationshipChangeStatus.Revoked) {
            if (!cipher.publicResponseCrypto) {
                throw new TransportError("The response crypto is missing.");
            }
            await this.secrets.convertSecrets(relationship.relationshipSecretId, cipher.publicResponseCrypto);
        }

        const responseContent = await this.decryptCreationChangeResponse(change, relationship.relationshipSecretId);

        const response = RelationshipChangeResponse.fromBackbone(change.response, responseContent.content);

        if (!relationship.cache) {
            throw this.newCacheEmptyError(Relationship, relationship.id.toString());
        }
        relationship.cache.changes[0].status = change.status;
        switch (change.status) {
            case RelationshipChangeStatus.Accepted:
                relationship.toActive(response);
                break;
            case RelationshipChangeStatus.Rejected:
                relationship.toRejected(response);
                break;
            case RelationshipChangeStatus.Revoked:
                relationship.toRevoked(response);
                break;
            default:
                throw CoreErrors.general.notSupported();
        }

        await this.relationships.update(relationshipDoc, relationship);
        return relationship;
    }

    @log()
    private async createNewRelationshipByIncomingCreationChange(change: BackboneGetRelationshipsChangesResponse): Promise<Relationship> {
        const backboneRelationship = (await this.client.getRelationship(change.relationshipId)).value;

        const templateId = CoreId.from(backboneRelationship.relationshipTemplateId);
        const template = await this.parent.relationshipTemplates.getRelationshipTemplate(templateId);

        if (!template) throw CoreErrors.general.recordNotFound(RelationshipTemplate, templateId.toString());
        if (!template.cache) throw this.newCacheEmptyError(RelationshipTemplate, template.id.toString());
        if (!change.request.content) throw this.newEmptyOrInvalidContentError(change);

        const secretId = await TransportIds.relationshipSecret.generate();
        const requestCipher = RelationshipCreationChangeRequestCipher.fromBase64(change.request.content);
        await this.secrets.createTemplatorSecrets(secretId, template.cache, requestCipher.publicRequestCrypto);

        const requestContent = await this.decryptCreationChangeRequest(backboneRelationship.changes[0].request, secretId, templateId);
        const relationshipChange = RelationshipChange.fromBackbone(change, requestContent.content);

        const relationship = Relationship.fromCreationChangeReceived(backboneRelationship, template, requestContent.identity, relationshipChange, secretId);

        await this.relationships.create(relationship);
        return relationship;
    }

    @log()
    private async completeChange(targetStatus: RelationshipChangeStatus, change: RelationshipChange, content?: ISerializable) {
        const relationshipDoc = await this.relationships.read(change.relationshipId.toString());
        if (!relationshipDoc) {
            throw CoreErrors.general.recordNotFound(Relationship, change.relationshipId.toString());
        }

        const relationship = Relationship.from(relationshipDoc);

        if (!relationship.cache) {
            await this.updateCacheOfRelationship(relationship);
        }

        if (!relationship.cache) {
            throw this.newCacheEmptyError(Relationship, relationship.id.toString());
        }

        const queriedChange = relationship.cache.changes.find((r) => r.id.toString() === change.id.toString());
        if (!queriedChange) {
            throw CoreErrors.general.recordNotFound(RelationshipChange, change.id.toString());
        }

        if (queriedChange.status !== RelationshipChangeStatus.Pending) {
            throw CoreErrors.relationships.wrongChangeStatus(queriedChange.status);
        }

        let encryptedContent;
        if (content) {
            encryptedContent =
                targetStatus === RelationshipChangeStatus.Revoked
                    ? await this.encryptRevokeContent(relationship, content)
                    : await this.encryptAcceptRejectContent(relationship, content);
        }

        let backboneResponse: BackboneGetRelationshipsResponse;
        switch (targetStatus) {
            case RelationshipChangeStatus.Accepted:
                backboneResponse = (await this.client.acceptRelationshipChange(relationship.id.toString(), change.id.toString(), encryptedContent)).value;
                break;

            case RelationshipChangeStatus.Rejected:
                backboneResponse = (await this.client.rejectRelationshipChange(relationship.id.toString(), change.id.toString(), encryptedContent)).value;
                break;

            case RelationshipChangeStatus.Revoked:
                backboneResponse = (await this.client.revokeRelationshipChange(relationship.id.toString(), change.id.toString(), encryptedContent)).value;
                break;

            default:
                throw new TransportError("target change status not supported");
        }
        const backboneChange = backboneResponse.changes[backboneResponse.changes.length - 1];

        queriedChange.response = RelationshipChangeResponse.fromBackbone(backboneResponse.changes[backboneResponse.changes.length - 1].response!, content);
        queriedChange.status = backboneChange.status;
        relationship.status = backboneResponse.status;

        await this.relationships.update(relationshipDoc, relationship);

        this.eventBus.publish(new RelationshipChangedEvent(this.parent.identity.address.toString(), relationship));

        return relationship;
    }

    private async encryptRevokeContent(relationship: Relationship, content: ICoreSerializable) {
        const responseContent = RelationshipCreationChangeResponseContentWrapper.from({
            relationshipId: relationship.id,
            content: content
        });

        const serializedResponse = responseContent.serialize();
        const buffer = CoreUtil.toBuffer(serializedResponse);

        const [deviceSignature, relationshipSignature] = await Promise.all([this.parent.activeDevice.sign(buffer), this.secrets.sign(relationship.relationshipSecretId, buffer)]);

        const signedResponse = RelationshipCreationChangeResponseSigned.from({
            serializedResponse: serializedResponse,
            deviceSignature: deviceSignature,
            relationshipSignature: relationshipSignature
        });

        const cipher = await this.secrets.encryptRequest(relationship.relationshipSecretId, signedResponse);
        const responseCipher = RelationshipCreationChangeResponseCipher.from({
            cipher: cipher
        });

        return responseCipher.toBase64();
    }

    private async encryptAcceptRejectContent(relationship: Relationship, content: ICoreSerializable) {
        const publicResponseCrypto = await this.secrets.getPublicResponse(relationship.relationshipSecretId);

        const responseContent = RelationshipCreationChangeResponseContentWrapper.from({
            relationshipId: relationship.id,
            content: content
        });

        const serializedResponse = responseContent.serialize();
        const buffer = CoreUtil.toBuffer(serializedResponse);

        const [deviceSignature, relationshipSignature] = await Promise.all([this.parent.activeDevice.sign(buffer), this.secrets.sign(relationship.relationshipSecretId, buffer)]);

        const signedResponse = RelationshipCreationChangeResponseSigned.from({
            serializedResponse: serializedResponse,
            deviceSignature: deviceSignature,
            relationshipSignature: relationshipSignature
        });

        const cipher = await this.secrets.encrypt(relationship.relationshipSecretId, signedResponse);
        const responseCipher = RelationshipCreationChangeResponseCipher.from({
            cipher: cipher,
            publicResponseCrypto: publicResponseCrypto
        });

        return responseCipher.toBase64();
    }

    private throwWrongChangeType(type: RelationshipChangeType) {
        throw new TransportError(`The relationship change has the wrong type (${type}) to run this operation`);
    }

    private newChangeResponseMissingError(changeId: string) {
        return new TransportError(`The response of the relationship change (${changeId}) is missing`);
    }

    private newEmptyOrInvalidContentError(change?: RelationshipChange | BackboneGetRelationshipsChangesResponse) {
        return new TransportError(`The content property of the relationship change ${change?.id} is missing or invalid`);
    }
}
