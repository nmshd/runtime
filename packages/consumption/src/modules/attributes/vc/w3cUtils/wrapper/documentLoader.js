const context = require("../context");

const jsldsig = require("jsonld-signatures");

const defaultDocumentLoader = require("vc-js").defaultDocumentLoader;

const { extendContextLoader } = jsldsig;

module.exports = {
    documentLoader: extendContextLoader((url) => {
        if (context.get(url) !== undefined) {
            return {
                contextUrl: null,
                documentUrl: url,
                document: context.get(url)
            };
        }
        return defaultDocumentLoader(url);
    }),
    setContext: context.set,
    getContext: context.get,
    getContexts: context
};
