import { CoreBuffer, CryptoHash, CryptoHashAlgorithm, Encoding, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreAddress } from "../../core";

const enmeshedPrefix = "did:e:";

export class IdentityUtil {
    public static async createAddress(publicKey: ICryptoSignaturePublicKey, backboneHostname: string): Promise<CoreAddress> {
        const sha512buffer = await CryptoHash.hash(publicKey.publicKey, CryptoHashAlgorithm.SHA512);
        const hash = await CryptoHash.hash(sha512buffer, CryptoHashAlgorithm.SHA256);
        const hashedPublicKey = new CoreBuffer(hash.buffer.slice(0, 10));
        const identityPart = hashedPublicKey.toString(Encoding.Hex);

        const checksumSource = CoreBuffer.fromUtf8(`${enmeshedPrefix}${backboneHostname}:dids:${hashedPublicKey.toString(Encoding.Hex)}`);
        const checksumHash = await CryptoHash.hash(checksumSource, CryptoHashAlgorithm.SHA256);
        const checksum = new CoreBuffer(checksumHash.buffer.slice(0, 1));

        const addressString = `${enmeshedPrefix}${backboneHostname}:dids:${identityPart}${checksum.toString(Encoding.Hex)}`;
        const addressObj = CoreAddress.from({ address: addressString });
        return addressObj;
    }

    public static async checkAddress(address: CoreAddress, backboneHostname: string, publicKey?: ICryptoSignaturePublicKey): Promise<boolean> {
        const str = address.toString();

        const prefixLength = enmeshedPrefix.length;
        const strWithoutPrefix = str.substring(prefixLength);
        if (!strWithoutPrefix.startsWith(backboneHostname)) {
            return false;
        }

        const strAddress = str.substring(str.length - 22);
        const strHashedPublicKey = strAddress.substring(0, 20);
        const strPrefixRealm = str.substring(0, str.length - 22);

        const addressBuffer = CoreBuffer.fromString(strAddress, Encoding.Hex).buffer;
        const sha256Array = addressBuffer.slice(0, addressBuffer.byteLength - 1);
        const checksumArray = addressBuffer.slice(addressBuffer.byteLength - 1, addressBuffer.byteLength);

        const checksumBuffer = CoreBuffer.fromUtf8(strPrefixRealm + strHashedPublicKey);

        const addressChecksum = await CryptoHash.hash(checksumBuffer, CryptoHashAlgorithm.SHA256);
        const firstByteOfChecksum = new CoreBuffer(addressChecksum.buffer.slice(0, 1));
        if (!firstByteOfChecksum.equals(new CoreBuffer(checksumArray))) {
            return false;
        }

        if (publicKey) {
            const sha512buffer = await CryptoHash.hash(publicKey.publicKey, CryptoHashAlgorithm.SHA512);
            let sha256buffer = await CryptoHash.hash(sha512buffer, CryptoHashAlgorithm.SHA256);
            sha256buffer = new CoreBuffer(sha256buffer.buffer.slice(0, 10));
            if (!sha256buffer.equals(new CoreBuffer(sha256Array))) {
                // Hash doesn't match with given public key.
                return false;
            }
        }
        return true;
    }
}
