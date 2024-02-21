import { LocalAttributeShareInfoJSON } from "@nmshd/consumption";
import { LocalAttributeDeletionStatusJSON } from "@nmshd/consumption/src/modules/attributes/local/LocalAttributeDeletionStatus";
import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";

export interface LocalAttributeDTO {
    id: string;
    parentId?: string;
    createdAt: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    succeeds?: string;
    succeededBy?: string;
    shareInfo?: LocalAttributeShareInfoJSON;
    deletionStatus?: LocalAttributeDeletionStatusJSON;
}
