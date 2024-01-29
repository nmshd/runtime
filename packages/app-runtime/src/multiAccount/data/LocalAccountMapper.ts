import { LocalAccountDTO } from "..";
import { LocalAccount } from "./LocalAccount";

export class LocalAccountMapper {
    public static toLocalAccountDTO(localAccount: LocalAccount): LocalAccountDTO {
        return {
            id: localAccount.id.toString(),
            address: localAccount.address?.toString(),
            name: localAccount.name,
            realm: localAccount.realm,
            directory: localAccount.directory.toString(),
            order: localAccount.order,
            lastAccessedAt: localAccount.lastAccessedAt?.toString()
        };
    }
}
