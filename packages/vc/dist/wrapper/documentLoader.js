"use strict";
const contexts = require("../context");
const jsldsig = require("jsonld-signatures");
const defaultDocumentLoader = require("vc-js").defaultDocumentLoader;
const { extendContextLoader } = jsldsig;
module.exports = {
    documentLoader: extendContextLoader(url => {
        if (contexts.get(url) !== undefined) {
            return {
                contextUrl: null,
                documentUrl: url,
                document: contexts.get(url)
            };
        }
        return defaultDocumentLoader(url);
    }),
    setContext: contexts.set,
    getContext: contexts.get,
    getContexts: contexts,
};
