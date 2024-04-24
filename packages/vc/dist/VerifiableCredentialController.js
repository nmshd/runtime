"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifiableCredentialController = void 0;
// @ts-expect-error
const { sign, init, verify } = require("./wrapper");
class VerifiableCredentialController {
    static async initialize() {
        if (this.instance) {
            return this.instance;
        }
        await init();
        this.instance = new VerifiableCredentialController();
        return this.instance;
    }
    async sign(data, publicKey, privateKey) {
        return await sign(data, publicKey, privateKey);
    }
    async verify(credential) {
        return await verify(credential);
    }
}
exports.VerifiableCredentialController = VerifiableCredentialController;
