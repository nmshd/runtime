import { IdentityMetadata } from "@nmshd/consumption";
import { IdentityMetadataDTO } from "../../../types";

export class IdentityMetadataMapper {
    public static toIdentityMetadataDTO(identityMetadata: IdentityMetadata): IdentityMetadataDTO {
        return {
            reference: identityMetadata.reference.toString(),
            key: identityMetadata.key,
            value: identityMetadata.value.toJSON()
        };
    }
}
