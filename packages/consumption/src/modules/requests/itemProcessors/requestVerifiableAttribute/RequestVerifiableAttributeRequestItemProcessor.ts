import { VerifiableCredentialController } from "@blubi/vc";
import {
    IdentityAttribute,
    RelationshipAttribute,
    Request,
    RequestVerifiableAttributeAcceptResponseItem,
    RequestVerifiableAttributeRequestItem,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { DeviceSecretType } from "@nmshd/transport";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { ValidationResult } from "../../../common";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";
import { AcceptVerifiableAttributeRequestItemParametersJSON } from "./AcceptVerifiableAttributeRequestItemParameters";

export class RequestVerifiableAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    RequestVerifiableAttributeRequestItem,
    AcceptVerifiableAttributeRequestItemParametersJSON
> {
    public override canCreateOutgoingRequestItem(requestItem: RequestVerifiableAttributeRequestItem, _request: Request, _recipient?: CoreAddress): ValidationResult {
        const attributeValidationResult = this.validateAttribute(requestItem.attribute);
        if (attributeValidationResult.isError()) {
            return attributeValidationResult;
        }

        return ValidationResult.success();
    }

    private validateAttribute(attribute: IdentityAttribute | RelationshipAttribute) {
        if (attribute.owner === this.currentIdentityAddress) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("The owner has to be the requesting party."));
        }

        return ValidationResult.success();
    }

    public override canAccept(
        _requestItem: RequestVerifiableAttributeRequestItem,
        _params: AcceptVerifiableAttributeRequestItemParametersJSON,
        _requestInfo: LocalRequestInfo
    ): ValidationResult {
        return ValidationResult.success();
    }

    public override async accept(
        requestItem: RequestVerifiableAttributeRequestItem,
        _params: AcceptVerifiableAttributeRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<RequestVerifiableAttributeAcceptResponseItem> {
        const parsedRequestAttribute = JSON.parse(JSON.stringify(requestItem.attribute));
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this["accountController"].identity.identity.publicKey.publicKey).toBase58()}`;
        const identityPrivateKey = ((await this["accountController"].activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature)) as any)!.secret["privateKey"];
        const multikeyPrivate = `z${CoreBuffer.from([0x80, 0x26]).append(identityPrivateKey).toBase58()}`;

        const vc = await VerifiableCredentialController.initialize();
        const credential = buildCredential(parsedRequestAttribute.value, requestItem.did, multikeyPublic);
        const signedCredential = await vc.sign(credential, multikeyPublic, multikeyPrivate);
        requestItem.attribute.proof = signedCredential;
        const peerAttribute = await this.consumptionController.attributes.createSharedLocalAttribute({
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        });

        return RequestVerifiableAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attribute: requestItem.attribute,
            attributeId: peerAttribute.id
        });
    }

    public override async applyIncomingResponseItem(
        responseItem: RequestVerifiableAttributeAcceptResponseItem,
        _requestItem: RequestVerifiableAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        const creationResult = await this.consumptionController.attributes.createRepositoryAttribute({
            content: responseItem.attribute
        });
        await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: requestInfo.peer,
            sourceAttributeId: creationResult.id,
            requestReference: requestInfo.id,
            attributeId: responseItem.attributeId
        });
    }
}

function buildCredential(data: any, subjectDid: string, publicKey: string) {
    const now = new Date().toJSON();
    const issuanceDate = `${now.substring(0, now.length - 5)}Z`;
    const credentialSubject: any = data;
    credentialSubject["id"] = subjectDid;
    return {
        "@context": ["https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"],
        type: ["VerifiableCredential"],
        issuer: `did:key:${publicKey}`,
        issuanceDate,
        credentialSubject
    };
}
