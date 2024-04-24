export const init: () => Promise<void>;
export const sign: (data: any, publicKey: any, privateKey: any) => Promise<any>;
export const verify: (credential: any) => Promise<any>;
