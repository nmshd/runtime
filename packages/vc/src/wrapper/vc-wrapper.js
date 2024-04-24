const documentLoader = require('./documentLoader.js').documentLoader;
let Ed25519Multikey;
let DataIntegrityProof;
let eddsa2022CryptoSuite;
let suiteContext;
const { sign } = require('jsonld-signatures');
const jsigs = require('jsonld-signatures');
let driver;
const { purposes: { AssertionProofPurpose } } = jsigs;
const jsonld = require('jsonld');

let initialized = false;

async function init() {
    if (initialized) {
        throw new Error("The vc lib has allready been initialized");
    }
    Ed25519Multikey = await import('@digitalbazaar/ed25519-multikey');
    const middle = await import('@digitalbazaar/data-integrity');
    DataIntegrityProof = middle.DataIntegrityProof;
    const mod = await import('@digitalbazaar/eddsa-2022-cryptosuite');
    eddsa2022CryptoSuite = mod.cryptosuite;
    eddsa2022CryptoSuite.canonize = canonize;
    suiteContext = await import("ed25519-signature-2020-context");
    let driver_mod = await import("@digitalbazaar/did-method-key");
    driver = driver_mod.driver();
    initialized = true;
}

async function issue(data, publicKey, privateKey) {
    const { suite, loader } = await prepareSign(publicKey, privateKey);

    const signedCredential = jsigs.sign(data, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader: loader
    });

    return signedCredential;
}

async function verify(credential) {
    const { suite, loader } = prepareVerify();
    return await jsigs.verify(credential, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader: loader
    });
}
 // Disable safe mode of canonization
function canonize(input, options) {
    return jsonld.canonize(input, {
      algorithm: 'URDNA2015',
      format: 'application/n-quads',
      safe: false,
      ...options
    });
  }

function prepareVerify() {
    const suite = new DataIntegrityProof({ cryptosuite: eddsa2022CryptoSuite });

    driver.use({
        multibaseMultikeyHeader: 'z6Mk',
        fromMultibase: Ed25519Multikey.from
    });

    const loader = async (url) => {
        if (url.startsWith("did:key:")) {
            const document = await driver.get({ url });
            return {
                url,
                document,
                static: true
            };
        }

        try {
            const x = suiteContext.documentLoader(url);
            return x;
        } catch (e) {
        }
        return documentLoader(url);
    };
    return { suite, loader };
}

async function prepareSign(publicKey, privateKey) {
    const keyPair = await Ed25519Multikey.from({
        type: "Multikey",
        id: `did:key:${publicKey}#${publicKey}`,
        publicKeyMultibase: publicKey,
        secretKeyMultibase: privateKey
    });

    const suite = new DataIntegrityProof({ signer: keyPair.signer(), cryptosuite: eddsa2022CryptoSuite });

    driver.use({
        multibaseMultikeyHeader: 'z6Mk',
        fromMultibase: Ed25519Multikey.from
    });
    const loader = async (url) => {
        if (url.startsWith("did:key:")) {
            const document = await driver.get({ url });
            return {
                url,
                document,
                static: true
            };
        }

        try {
            const x = suiteContext.documentLoader(url);
            return x;
        } catch (e) {
        }
        return documentLoader(url);
    };
    return { suite, loader };
}

module.exports = {
    sign: issue,
    verify,
    init
}
