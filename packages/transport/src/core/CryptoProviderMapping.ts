/* eslint-disable @typescript-eslint/naming-convention */
import { DeviceBoundKeyHandle, hasProviderForSecurityLevel, PortableKeyHandle } from "@nmshd/crypto";
import { SecurityLevel } from "@nmshd/rs-crypto-types";
import { CoreCrypto } from "./CoreCrypto";

export const CryptoProviderTypes = {
    Software: "Software",
    Hardware: "Hardware",
    Network: "Network",
    LEGACY: "LEGACY"
} as const;

export const CryptoPurpose = {
    DeviceKeyPair: "deviceKeyPair",
    BaseKey: "baseKey",
    Default: "default"
} as const;
type CryptoPurpose = (typeof CryptoPurpose)[keyof typeof CryptoPurpose];

export const CryptoKeyType = {
    Signature: "signature",
    Encryption: "encryption",
    Derivation: "derivation",
    Exchange: "exchange"
} as const;
type CryptoKeyType = (typeof CryptoKeyType)[keyof typeof CryptoKeyType];

export const CryptoObject = {
    AccountController: "AccountController",
    AnonymousTokenController: "AnonymousTokenController",
    Certificate: "Certificate",
    DeviceController: "DeviceController",
    DeviceSecretController: "DeviceSecretController",
    IdentityController: "IdentityController",
    FileController: "FileController",
    MessageController: "MessageController",
    RelationshipTemplateController: "RelationshipTemplateController",
    RelationshipsController: "RelationshipsController",
    RelationshipSecretController: "RelationshipSecretController",
    SecretController: "SecretController",
    TokenController: "TokenController"
} as const;
type CryptoObject = (typeof CryptoObject)[keyof typeof CryptoObject];

export const ALL_CRYPTO_PROVIDERS = ["SoftwareProvider", "AndroidProvider"];

const CRYPTO_OPERATION_OBJECT_MAP: Partial<Record<CryptoObject, CryptoKeyType[]>> = {
    [CryptoObject.AccountController]: [CryptoKeyType.Encryption, CryptoKeyType.Signature],
    [CryptoObject.AnonymousTokenController]: [CryptoKeyType.Derivation],
    [CryptoObject.Certificate]: [CryptoKeyType.Encryption],
    [CryptoObject.DeviceController]: [CryptoKeyType.Signature, CryptoKeyType.Encryption],
    [CryptoObject.DeviceSecretController]: [CryptoKeyType.Derivation],
    [CryptoObject.FileController]: [CryptoKeyType.Encryption],
    [CryptoObject.IdentityController]: [CryptoKeyType.Encryption],
    [CryptoObject.MessageController]: [CryptoKeyType.Encryption],
    [CryptoObject.RelationshipTemplateController]: [CryptoKeyType.Derivation, CryptoKeyType.Encryption],
    [CryptoObject.RelationshipsController]: [CryptoKeyType.Encryption],
    [CryptoObject.RelationshipSecretController]: [CryptoKeyType.Encryption],
    [CryptoObject.SecretController]: [CryptoKeyType.Encryption],
    [CryptoObject.TokenController]: [CryptoKeyType.Encryption]
};

const OBJECT_OPERATION_PREFERENCES: Partial<
    Record<CryptoObject, Partial<Record<CryptoKeyType, SecurityLevel | Partial<Record<Exclude<CryptoPurpose, undefined>, SecurityLevel>>>>>
> = {
    [CryptoObject.AccountController]: {
        [CryptoKeyType.Signature]: {
            [CryptoPurpose.DeviceKeyPair]: CryptoProviderTypes.Hardware,
            [CryptoPurpose.Default]: CryptoProviderTypes.Software
        },
        [CryptoKeyType.Encryption]: {
            [CryptoPurpose.BaseKey]: CryptoProviderTypes.Hardware,
            [CryptoPurpose.Default]: CryptoProviderTypes.Software
        }
    },
    [CryptoObject.AnonymousTokenController]: {
        [CryptoKeyType.Derivation]: CryptoProviderTypes.Software
    },
    [CryptoObject.Certificate]: {},
    [CryptoObject.DeviceController]: {},
    [CryptoObject.DeviceSecretController]: {
        [CryptoKeyType.Encryption]: CryptoProviderTypes.Hardware
    },
    [CryptoObject.FileController]: {
        [CryptoKeyType.Encryption]: CryptoProviderTypes.Software
    },
    [CryptoObject.IdentityController]: {},
    [CryptoObject.MessageController]: {
        [CryptoKeyType.Encryption]: CryptoProviderTypes.Software
    },
    [CryptoObject.RelationshipTemplateController]: {
        [CryptoKeyType.Encryption]: CryptoProviderTypes.Software
    },
    [CryptoObject.RelationshipsController]: {},
    [CryptoObject.RelationshipSecretController]: {},
    [CryptoObject.SecretController]: {
        [CryptoKeyType.Exchange]: CryptoProviderTypes.Software
    },
    [CryptoObject.TokenController]: {
        [CryptoKeyType.Encryption]: CryptoProviderTypes.Software
    }
};

const DEFAULT_OPERATION_PREFERENCES: Partial<Record<CryptoKeyType, SecurityLevel>> = {
    [CryptoKeyType.Derivation]: CryptoProviderTypes.Software,
    [CryptoKeyType.Signature]: CryptoProviderTypes.Hardware,
    [CryptoKeyType.Encryption]: CryptoProviderTypes.Software,
    [CryptoKeyType.Exchange]: CryptoProviderTypes.Software
};

const FALLBACK_PREFERENCE: SecurityLevel = CryptoProviderTypes.Software;

export function getPreferredProviderLevel(cryptoObject: CryptoObject, cryptoOperation: CryptoKeyType, purpose?: Exclude<CryptoPurpose, undefined>): SecurityLevel {
    const allowedOps = CRYPTO_OPERATION_OBJECT_MAP[cryptoObject];
    if (allowedOps && !allowedOps.includes(cryptoOperation)) {
        throw new Error(`Operation '${cryptoOperation}' is not supported for object '${cryptoObject}'.`);
    }

    let chosenSecurityLevel: SecurityLevel | undefined;
    const objectPrefs = OBJECT_OPERATION_PREFERENCES[cryptoObject];
    if (objectPrefs) {
        const operationPrefOrMap = objectPrefs[cryptoOperation];
        if (operationPrefOrMap) {
            if (typeof operationPrefOrMap === "object") {
                if (purpose && operationPrefOrMap[purpose]) {
                    chosenSecurityLevel = operationPrefOrMap[purpose];
                }
            } else {
                chosenSecurityLevel = operationPrefOrMap;
            }
        }
    }

    if (!chosenSecurityLevel) {
        const operationPref = DEFAULT_OPERATION_PREFERENCES[cryptoOperation];
        chosenSecurityLevel = operationPref ?? FALLBACK_PREFERENCE;
    }

    if (!hasProviderForSecurityLevel(chosenSecurityLevel)) {
        if (chosenSecurityLevel !== FALLBACK_PREFERENCE && !hasProviderForSecurityLevel(FALLBACK_PREFERENCE)) {
            throw new Error(`No provider available for either ${chosenSecurityLevel} or fallback ${FALLBACK_PREFERENCE} for operation ${cryptoOperation}.`);
        }
        return FALLBACK_PREFERENCE;
    }

    return chosenSecurityLevel;
}

export async function getPreferredProviderKeyHandle(
    cryptoObject: CryptoObject,
    cryptoOperation: CryptoKeyType,
    isPortable: boolean,
    purpose?: CryptoPurpose
): Promise<DeviceBoundKeyHandle | PortableKeyHandle> {
    const securityLevel = getPreferredProviderLevel(cryptoObject, cryptoOperation, purpose);

    switch (securityLevel) {
        case CryptoProviderTypes.Hardware:
            if (isPortable) {
                return await CoreCrypto.generatePortableKeyHandle({ securityLevel });
            }
            return await CoreCrypto.generateDeviceBoundKeyHandle({ securityLevel });

        case CryptoProviderTypes.Software:
            if (isPortable) {
                return await CoreCrypto.generatePortableKeyHandle({ securityLevel });
            }
            return await CoreCrypto.generateDeviceBoundKeyHandle({ securityLevel });

        default:
            throw new Error(`Unsupported SecurityLevel '${securityLevel}' encountered for key handle generation.`);
    }
}
