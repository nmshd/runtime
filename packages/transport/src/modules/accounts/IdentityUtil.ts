import { CoreBuffer, CryptoHash, CryptoHashAlgorithm, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreAddress, CoreErrors } from "../../core";

export class IdentityUtil {
    public static async createAddress(publicKey: ICryptoSignaturePublicKey, realm: string): Promise<CoreAddress> {
        if (realm.length !== 3) throw CoreErrors.general.realmLength();

        const sha512buffer = await CryptoHash.hash(publicKey.publicKey, CryptoHashAlgorithm.SHA512);
        const hash = await CryptoHash.hash(sha512buffer, CryptoHashAlgorithm.SHA256);
        const hashedPublicKey = new CoreBuffer(hash.buffer.slice(0, 20));

        const checksumSource = CoreBuffer.fromUtf8(realm);
        checksumSource.append(hashedPublicKey);

        const addressChecksum1 = await CryptoHash.hash(checksumSource, CryptoHashAlgorithm.SHA512);
        const checksumHash = await CryptoHash.hash(addressChecksum1, CryptoHashAlgorithm.SHA256);
        const checksum = new CoreBuffer(checksumHash.buffer.slice(0, 4));

        const concatenation = hashedPublicKey;
        concatenation.append(checksum);

        const addressString = realm + concatenation.toBase58();
        const addressObj = CoreAddress.from({ address: addressString });
        return addressObj;
    }

    public static async checkAddress(address: CoreAddress, publicKey?: ICryptoSignaturePublicKey, realm = "id1"): Promise<boolean> {
        const str = address.toString();
        const strRealm = str.substr(0, 3);
        if (realm && strRealm !== realm) {
            return false;
        }

        const strAddress = str.substr(3);

        const addressBuffer = CoreBuffer.fromBase58(strAddress).buffer;

        const sha256Array = addressBuffer.slice(0, addressBuffer.byteLength - 4);
        const checksumArray = addressBuffer.slice(addressBuffer.byteLength - 4, addressBuffer.byteLength);

        const checksumBuffer = CoreBuffer.fromUtf8(strRealm);
        checksumBuffer.append(new CoreBuffer(sha256Array));
        const addressChecksum1 = await CryptoHash.hash(checksumBuffer, CryptoHashAlgorithm.SHA512);
        const addressChecksum2 = await CryptoHash.hash(addressChecksum1, CryptoHashAlgorithm.SHA256);
        const firstBytesOfChecksum = new CoreBuffer(addressChecksum2.buffer.slice(0, 4));
        if (!firstBytesOfChecksum.equals(new CoreBuffer(checksumArray))) {
            return false;
        }

        if (publicKey) {
            const sha512buffer = await CryptoHash.hash(publicKey.publicKey, CryptoHashAlgorithm.SHA512);
            let sha256buffer = await CryptoHash.hash(sha512buffer, CryptoHashAlgorithm.SHA256);
            sha256buffer = new CoreBuffer(sha256buffer.buffer.slice(0, 20));
            if (!sha256buffer.equals(new CoreBuffer(sha256Array))) {
                // Hash doesn't match with given public key.
                return false;
            }
        }
        return true;
    }
}
