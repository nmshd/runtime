import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { DeviceSecretType } from "@nmshd/transport";
import { AbstractVCProcessor } from "./AbstractVCProcessor";
import { init, sign, verify } from "./w3cUtils/wrapper";

export class W3CVCProcessor extends AbstractVCProcessor<any> {
    public override async init(): Promise<this> {
        await init();
        return this;
    }

    public override async sign(data: object, subjectDid: string): Promise<unknown> {
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this.accountController.identity.identity.publicKey.publicKey).toBase58()}`;
        const privateKeyContainer = await this.accountController.activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature);
        if (!privateKeyContainer) throw new Error("no private key"); // TODO: improve error

        const identityPrivateKey = (privateKeyContainer.secret as any).privateKey; // TODO: improve any
        const multikeyPrivate = `z${CoreBuffer.from([0x80, 0x26]).append(identityPrivateKey).toBase58()}`;

        const issuanceDate = CoreDate.utc().toString();
        const enrichedData = {
            "@context": ["https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"],
            type: ["VerifiableCredential"],
            issuer: `did:key:${multikeyPublic}`,
            issuanceDate,
            credentialSubject: { ...data, id: subjectDid }
        };

        return await sign(enrichedData, multikeyPublic, multikeyPrivate);
    }

    public override async verify(data: any): Promise<{ isSuccess: false } | { isSuccess: true; payload: Record<string, unknown> }> {
        const verificationSuccessful = await verify(data);
        if (verificationSuccessful) {
            return {
                isSuccess: true,
                payload: data.credentialSubject
            };
        }

        return { isSuccess: false };
    }
}
