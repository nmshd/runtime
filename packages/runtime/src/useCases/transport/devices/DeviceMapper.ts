import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CryptoSecretKey, CryptoSignaturePrivateKey, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { Device, DeviceSharedSecret } from "@nmshd/transport";
import { DeviceDTO, DeviceOnboardingInfoDTO } from "../../../types";

export class DeviceMapper {
    public static toDeviceDTO(device: Device, isCurrentDevice: boolean): DeviceDTO {
        return {
            id: device.id.toString(),
            isAdmin: device.isAdmin ?? false,
            createdAt: device.createdAt.toString(),
            createdByDevice: device.createdByDevice.toString(),
            name: device.name,
            type: device.type.toString(),
            username: device.username,
            certificate: device.certificate,
            description: device.description,
            lastLoginAt: device.lastLoginAt?.toString(),
            operatingSystem: device.operatingSystem,
            publicKey: device.publicKey?.toBase64(false),
            isCurrentDevice: isCurrentDevice,
            isOffboarded: device.isOffboarded,
            isBackupDevice: device.isBackupDevice
        };
    }

    public static toDeviceOnboardingInfoDTO(deviceSharedSecret: DeviceSharedSecret): DeviceOnboardingInfoDTO {
        return {
            id: deviceSharedSecret.id.toString(),
            createdAt: deviceSharedSecret.createdAt.toString(),
            createdByDevice: deviceSharedSecret.createdByDevice.toString(),
            name: deviceSharedSecret.name,
            description: deviceSharedSecret.description,
            secretBaseKey: deviceSharedSecret.secretBaseKey.toBase64(false),
            deviceIndex: deviceSharedSecret.deviceIndex,
            synchronizationKey: deviceSharedSecret.synchronizationKey.toBase64(false),
            identityPrivateKey: deviceSharedSecret.identityPrivateKey ? deviceSharedSecret.identityPrivateKey.toBase64(false) : undefined,
            identity: {
                address: deviceSharedSecret.identity.address.toString(),
                publicKey: deviceSharedSecret.identity.publicKey.toBase64(false)
            },
            password: deviceSharedSecret.password,
            username: deviceSharedSecret.username,
            profileName: deviceSharedSecret.profileName,
            isBackupDevice: deviceSharedSecret.isBackupDevice
        };
    }

    public static toDeviceSharedSecret(deviceOnboardingDTO: DeviceOnboardingInfoDTO): DeviceSharedSecret {
        const sharedSecret = DeviceSharedSecret.from({
            id: CoreId.from(deviceOnboardingDTO.id),
            createdAt: CoreDate.from(deviceOnboardingDTO.createdAt),
            createdByDevice: CoreId.from(deviceOnboardingDTO.createdByDevice),
            name: deviceOnboardingDTO.name,
            description: deviceOnboardingDTO.description,
            secretBaseKey: CryptoSecretKey.fromBase64(deviceOnboardingDTO.secretBaseKey),
            deviceIndex: deviceOnboardingDTO.deviceIndex,
            synchronizationKey: CryptoSecretKey.fromBase64(deviceOnboardingDTO.synchronizationKey),
            identityPrivateKey: deviceOnboardingDTO.identityPrivateKey ? CryptoSignaturePrivateKey.fromBase64(deviceOnboardingDTO.identityPrivateKey) : undefined,
            identity: {
                address: CoreAddress.from(deviceOnboardingDTO.identity.address),
                publicKey: CryptoSignaturePublicKey.fromBase64(deviceOnboardingDTO.identity.publicKey)
            },
            password: deviceOnboardingDTO.password,
            username: deviceOnboardingDTO.username,
            profileName: deviceOnboardingDTO.profileName,
            isBackupDevice: deviceOnboardingDTO.isBackupDevice
        });
        return sharedSecret;
    }
}
