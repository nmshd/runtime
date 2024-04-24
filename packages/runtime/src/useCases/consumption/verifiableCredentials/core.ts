export function buildCredential(data: any, subjectDid: string, publicKey: string): any {
    const now = new Date().toJSON();
    const issuanceDate = `${now.substring(0, now.length - 5)}Z`;
    const credentialSubject: any = data;
    // const type = data["@type"];
    // delete data["@type"];
    // credentialSubject[`${type}`] = { ...data };
    credentialSubject["id"] = subjectDid;
    return {
        "@context": ["https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"],
        type: ["VerifiableCredential"],
        issuer: `did:key:${publicKey}`,
        issuanceDate,
        credentialSubject
    };
}
