// @ts-expect-error
const { sign, init, verify } = require("./wrapper");


export class VerifiableCredentialController {
    private static instance?: VerifiableCredentialController;
    static async initialize(): Promise<VerifiableCredentialController> {
        if (this.instance) {
            return this.instance;
        }
        await init();
        this.instance = new VerifiableCredentialController();
        return this.instance;
    }

    async sign(data: any, publicKey: string, privateKey: string): Promise<any> {
        return await sign(data, publicKey, privateKey)
    }

    async verify(credential: any): Promise<any> {
        return await verify(credential);
    }
}
