declare function issue(data: any, publicKey: any, privateKey: any): Promise<any>;
export function verify(credential: any): Promise<any>;
export function init(): Promise<void>;
export { issue as sign };
