import { LocalAccount } from "./LocalAccount.js";
import { LocalAccountDTO } from "./LocalAccountDTO.js";

export class LocalAccountMapper {
    public static toLocalAccountDTO(localAccount: LocalAccount): LocalAccountDTO {
        return {
            id: localAccount.id.toString(),
            address: localAccount.address?.toString(),
            name: localAccount.name,
            directory: localAccount.directory.toString(),
            order: localAccount.order,
            lastAccessedAt: localAccount.lastAccessedAt?.toString(),
            devicePushIdentifier: localAccount.devicePushIdentifier,
            deletionDate: localAccount.deletionDate?.toString()
        };
    }
}
