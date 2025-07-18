import { ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { CoreCrypto, PasswordProtection, TransportCoreErrors } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { ControllerName, TransportController } from "../../core/TransportController";
import { PeerRelationshipTemplateLoadedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { Relationship } from "../relationships/local/Relationship";
import { RelationshipSecretController } from "../relationships/RelationshipSecretController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { TokenContentRelationshipTemplate } from "../tokens/transmission/TokenContentRelationshipTemplate";
import { BackboneGetRelationshipTemplatesResponse } from "./backbone/BackboneGetRelationshipTemplates";
import { RelationshipTemplateClient } from "./backbone/RelationshipTemplateClient";
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
        super(controllerName ?? ControllerName.RelationshipTemplate, parent);
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

        const password = parameters.passwordProtection?.password;
        const salt = password ? await CoreCrypto.random(16) : undefined;
        const hashedPassword = password ? (await CoreCrypto.deriveHashOutOfPassword(password, salt!)).toBase64() : undefined;

        const backboneResponse = (
            await this.client.createRelationshipTemplate({
                expiresAt: parameters.expiresAt.toString(),
                maxNumberOfAllocations: parameters.maxNumberOfAllocations,
                forIdentity: parameters.forIdentity?.address.toString(),
                password: hashedPassword,
                content: cipher.toBase64()
            })
        ).value;

        const passwordProtection = parameters.passwordProtection
            ? PasswordProtection.from({
                  password: parameters.passwordProtection.password,
                  passwordType: parameters.passwordProtection.passwordType,
                  salt: salt!,
                  passwordLocationIndicator: parameters.passwordProtection.passwordLocationIndicator
              })
            : undefined;

        const template = RelationshipTemplate.from({
            id: CoreId.from(backboneResponse.id),
            secretKey: secretKey,
            isOwn: true,
            passwordProtection,
            content: parameters.content,
            createdAt: CoreDate.from(backboneResponse.createdAt),
            createdBy: this.parent.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            expiresAt: parameters.expiresAt,
            identity: this.parent.identity.identity,
            forIdentity: parameters.forIdentity,
            maxNumberOfAllocations: parameters.maxNumberOfAllocations,
            templateKey: templateKey
        });

        await this.templates.create(template);

        return template;
    }

    public async deleteRelationshipTemplate(template: RelationshipTemplate): Promise<void> {
        if (template.isOwn) {
            const response = await this.client.deleteRelationshipTemplate(template.id.toString());
            if (response.isError) throw response.error;
        }

        await this.templates.delete(template);
    }

    public async getRelationshipTemplates(query?: any): Promise<RelationshipTemplate[]> {
        const templateDocs = await this.templates.find(query);
        return this.parseArray<RelationshipTemplate>(templateDocs, RelationshipTemplate);
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

    public async loadPeerRelationshipTemplateByReference(reference: RelationshipTemplateReference, password?: string): Promise<RelationshipTemplate> {
        if (reference.passwordProtection && !password) throw TransportCoreErrors.general.noPasswordProvided();
        const passwordProtection = reference.passwordProtection
            ? PasswordProtection.from({
                  salt: reference.passwordProtection.salt,
                  passwordType: reference.passwordProtection.passwordType,
                  password: password!,
                  passwordLocationIndicator: reference.passwordProtection.passwordLocationIndicator
              })
            : undefined;

        return await this.loadPeerRelationshipTemplate(reference.id, reference.key, reference.forIdentityTruncated, passwordProtection);
    }

    public async loadPeerRelationshipTemplateByTokenContent(tokenContent: TokenContentRelationshipTemplate, password?: string): Promise<RelationshipTemplate> {
        if (tokenContent.passwordProtection && !password) throw TransportCoreErrors.general.noPasswordProvided();
        const passwordProtection = tokenContent.passwordProtection
            ? PasswordProtection.from({
                  salt: tokenContent.passwordProtection.salt,
                  passwordType: tokenContent.passwordProtection.passwordType,
                  password: password!,
                  passwordLocationIndicator: tokenContent.passwordProtection.passwordLocationIndicator
              })
            : undefined;

        return await this.loadPeerRelationshipTemplate(tokenContent.templateId, tokenContent.secretKey, tokenContent.forIdentity?.toString(), passwordProtection);
    }

    private async loadPeerRelationshipTemplate(
        id: CoreId,
        secretKey: CryptoSecretKey,
        forIdentityTruncated?: string,
        passwordProtection?: PasswordProtection
    ): Promise<RelationshipTemplate> {
        const templateDoc = await this.templates.read(id.toString());
        if (!templateDoc && forIdentityTruncated && !this.parent.identity.address.toString().endsWith(forIdentityTruncated)) {
            throw TransportCoreErrors.general.notIntendedForYou(id.toString());
        }

        if (templateDoc) {
            const template = RelationshipTemplate.from(templateDoc);
            return template;
        }

        const hashedPassword = passwordProtection ? (await CoreCrypto.deriveHashOutOfPassword(passwordProtection.password, passwordProtection.salt)).toBase64() : undefined;
        const backboneResponse = await this.client.getRelationshipTemplate(id.toString(), hashedPassword);
        const backboneTemplate = backboneResponse.value;

        const decrypted = await this.decryptRelationshipTemplate(backboneTemplate, secretKey);

        const relationshipTemplate = RelationshipTemplate.from({
            id: id,
            secretKey: secretKey,
            isOwn: false,
            passwordProtection,
            ...decrypted
        });

        await this.templates.create(relationshipTemplate);

        this.eventBus.publish(new PeerRelationshipTemplateLoadedEvent(this.parent.identity.address.toString(), relationshipTemplate));

        return relationshipTemplate;
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

        return {
            content: templateContent.content,
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: response.expiresAt ? CoreDate.from(response.expiresAt) : undefined,
            identity: templateContent.identity,
            maxNumberOfAllocations: response.maxNumberOfAllocations ?? undefined,
            forIdentity: response.forIdentity ? CoreAddress.from(response.forIdentity) : undefined,
            templateKey: templateContent.templateKey
        };
    }

    public async cleanupTemplatesOfDecomposedRelationship(relationship: Relationship): Promise<void> {
        const templateOfRelationship = await this.getRelationshipTemplate(relationship.templateId);
        if (templateOfRelationship && (!templateOfRelationship.isOwn || templateOfRelationship.maxNumberOfAllocations === 1)) {
            await this.templates.delete(templateOfRelationship);
        }

        const otherTemplatesOfPeer = await this.getRelationshipTemplates({ createdBy: relationship.peer.address.toString() });

        for (const template of otherTemplatesOfPeer) {
            await this.templates.delete(template);
        }
    }
}
