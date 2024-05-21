import { LocalAccountDTO } from "..";
import { LocalAccount } from "./LocalAccount";

export class LocalAccountMapper {
    public static toLocalAccountDTO(localAccount: LocalAccount): LocalAccountDTO {
        return {
            id: localAccount.id.toString(),
            address: localAccount.address?.toString(),
            name: localAccount.name,
            directory: localAccount.directory.toString(),
            order: localAccount.order,
            lastAccessedAt: localAccount.lastAccessedAt?.toString()
        };
    }
}
