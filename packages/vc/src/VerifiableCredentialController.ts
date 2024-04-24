// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sign, init, verify } = require("./wrapper");

export class VerifiableCredentialController {
    private static instance?: VerifiableCredentialController;
    public static async initialize(): Promise<VerifiableCredentialController> {
        if (this.instance) {
            return this.instance;
        }
        await init();
        this.instance = new VerifiableCredentialController();
        return this.instance;
    }

    public async sign(data: any, publicKey: string, privateKey: string): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/return-await
        return await sign(data, publicKey, privateKey);
    }

    public async verify(credential: any): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/return-await
        return await verify(credential);
    }
}
