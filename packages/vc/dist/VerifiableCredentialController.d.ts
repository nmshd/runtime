export declare class VerifiableCredentialController {
    private static instance?;
    static initialize(): Promise<VerifiableCredentialController>;
    sign(data: any, publicKey: string, privateKey: string): Promise<any>;
    verify(credential: any): Promise<any>;
}
