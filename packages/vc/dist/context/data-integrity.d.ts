declare const _exports: {
    "@context": {
        id: string;
        type: string;
        "@protected": boolean;
        proof: {
            "@id": string;
            "@type": string;
            "@container": string;
        };
        DataIntegrityProof: {
            "@id": string;
            "@context": {
                "@protected": boolean;
                id: string;
                type: string;
                challenge: string;
                created: {
                    "@id": string;
                    "@type": string;
                };
                domain: string;
                expires: {
                    "@id": string;
                    "@type": string;
                };
                nonce: string;
                proofPurpose: {
                    "@id": string;
                    "@type": string;
                    "@context": {
                        "@protected": boolean;
                        id: string;
                        type: string;
                        assertionMethod: {
                            "@id": string;
                            "@type": string;
                            "@container": string;
                        };
                        authentication: {
                            "@id": string;
                            "@type": string;
                            "@container": string;
                        };
                        capabilityInvocation: {
                            "@id": string;
                            "@type": string;
                            "@container": string;
                        };
                        capabilityDelegation: {
                            "@id": string;
                            "@type": string;
                            "@container": string;
                        };
                        keyAgreement: {
                            "@id": string;
                            "@type": string;
                            "@container": string;
                        };
                    };
                };
                cryptosuite: string;
                proofValue: {
                    "@id": string;
                    "@type": string;
                };
                verificationMethod: {
                    "@id": string;
                    "@type": string;
                };
            };
        };
    };
};
export = _exports;
