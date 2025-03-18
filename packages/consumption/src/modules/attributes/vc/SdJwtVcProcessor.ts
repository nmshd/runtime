import { CoreBuffer } from "@nmshd/crypto";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import didJWT from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "key-did-resolver";
import { AbstractVCProcessor } from "./AbstractVCProcessor";

export class SdJwtVcProcessor extends AbstractVCProcessor<any> {
    public override async init(): Promise<this> {
        return await Promise.resolve(this);
    }

    public override async sign(data: object, subjectDid: string): Promise<unknown> {
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this.accountController.identity.identity.publicKey.publicKey).toBase58()}`;

        const agent = new SDJwtVcInstance({
            signer: async (string: string) => (await this.accountController.identity.sign(CoreBuffer.fromUtf8(string))).signature.toUtf8(),
            signAlg: "EdDSA" // https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms
        });

        const issuanceDate = new Date().getTime();
        const enrichedData = {
            vct: "placeholder",
            iss: `did:key:${multikeyPublic}`,
            sub: subjectDid,
            iat: issuanceDate,
            ...data
        };

        return await agent.issue(enrichedData);
    }

    public override async verify(data: any): Promise<boolean> {
        const didResolver = new Resolver(getResolver());

        const agent = new SDJwtVcInstance({
            verifier: async (data: string, _signature: string) => {
                try {
                    await didJWT.verifyJWT(data, { resolver: didResolver });
                    return true;
                } catch (_) {
                    return false;
                }
            }
        });
        try {
            await agent.verify(data);
            return true;
        } catch (_) {
            return false;
        }
    }
}
