import { DataIntegrityProof } from "@digitalbazaar/data-integrity";
import { contexts as dataIntegrityContexts } from "@digitalbazaar/data-integrity-context";
import { securityLoader } from "@digitalbazaar/security-document-loader";
import * as vc from "@digitalbazaar/vc";
import { BitstringStatusList, createCredential, VC_BSL_VC_V2_CONTEXT } from "@digitalbazaar/vc-bitstring-status-list";
import { contexts as bitstringStatusListContexts } from "@digitalbazaar/vc-bitstring-status-list-context";
import { CoreBuffer } from "@nmshd/crypto";
import * as jsonld from "jsonld";

const documentLoader = securityLoader();
documentLoader.addDocuments({ documents: dataIntegrityContexts });
documentLoader.addDocuments({ documents: bitstringStatusListContexts });
let eddsa2022CryptoSuite;
let loader;

let initialized = false;

async function init() {
    if (initialized) {
        return;
    }
    const mod = await import("@digitalbazaar/eddsa-2022-cryptosuite");
    eddsa2022CryptoSuite = mod.cryptosuite;
    eddsa2022CryptoSuite.canonize = canonize;

    loader = documentLoader.build();
    initialized = true;
}

async function issue(data, accountController) {
    const { suite, documentLoader } = prepareSign(accountController);

    const signedCredential = await vc.issue({ credential: data, suite, documentLoader });

    return signedCredential;
}

async function verify(credential) {
    const { suite, documentLoader } = prepareVerify();
    return await vc.verifyCredential({
        credential,
        suite,
        documentLoader
    });
}
// Disable safe mode of canonization - otherwise enmeshed's @type is misinterpreted as JSON-LD's @type causing an error because it's not a URL
async function canonize(input, options) {
    return await jsonld.canonize(input, {
        ...options,
        algorithm: "URDNA2015",
        format: "application/n-quads",
        safe: false
    });
}

function prepareVerify() {
    const suite = new DataIntegrityProof({ cryptosuite: eddsa2022CryptoSuite });

    return { suite, documentLoader: loader };
}

function prepareSign(accountController) {
    const signer = {
        sign: async (data) => (await accountController.identity.sign(CoreBuffer.from(data.data))).signature.buffer,
        algorithm: "Ed25519",
        id: "an-id"
    };

    const suite = new DataIntegrityProof({ signer, cryptosuite: eddsa2022CryptoSuite });

    return { suite, documentLoader: loader };
}

async function issueStatusList(uri, accountController, issuerId) {
    const list = new BitstringStatusList({ length: 8 });
    const statusPurpose = "revocation";

    const credential = await createCredential({
        id: uri,
        list,
        statusPurpose,
        context: VC_BSL_VC_V2_CONTEXT
    });

    const completedCredential = { ...credential, issuer: issuerId };

    return await issue(completedCredential, accountController);
}

module.exports = {
    sign: issue,
    verify,
    init,
    issueStatusList
};
