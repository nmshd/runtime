import { Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import {
	IdentityAttribute,
	IdentityAttributeJSON,
	IIdentityAttribute,
	IRelationshipAttribute,
	RelationshipAttribute,
	RelationshipAttributeJSON
} from "../../../attributes"
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem"

export interface RequestVerifiableAttributeRequestItemJSON extends RequestItemJSON {
	"@type": "RequestVerifiableAttributeRequestItem"
	attribute: IdentityAttributeJSON | RelationshipAttributeJSON
	did: string
}

export interface IRequestVerifiableAttributeRequestItem extends IRequestItem {
	attribute: IIdentityAttribute | IRelationshipAttribute
	did: string
}

@type("RequestVerifiableAttributeRequestItem")
export class RequestVerifiableAttributeRequestItem
	extends RequestItem
	implements IRequestVerifiableAttributeRequestItem {
	@serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
	@validate()
	public attribute: IdentityAttribute | RelationshipAttribute

	@validate()
	public did: string

	public static from(
		value: IRequestVerifiableAttributeRequestItem | Omit<RequestVerifiableAttributeRequestItemJSON, "@type">
	): RequestVerifiableAttributeRequestItem {
		return this.fromAny(value)
	}

	protected static override postFrom<T extends Serializable>(value: T): T {
		if (!(value instanceof RequestVerifiableAttributeRequestItem)) throw new Error("this should never happen")

		return value
	}

	public override toJSON(
		verbose?: boolean | undefined,
		serializeAsString?: boolean | undefined
	): RequestVerifiableAttributeRequestItemJSON {
		return super.toJSON(verbose, serializeAsString) as RequestVerifiableAttributeRequestItemJSON
	}
}

