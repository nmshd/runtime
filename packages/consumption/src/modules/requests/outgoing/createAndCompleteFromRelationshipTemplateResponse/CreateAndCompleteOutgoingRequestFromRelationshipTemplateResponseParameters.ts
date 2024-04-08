import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IResponse, Response } from "@nmshd/content";
import { CoreDate, ICoreDate, IMessage, IRelationship, IRelationshipTemplate, Message, Relationship, RelationshipTemplate } from "@nmshd/transport";

export interface ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters extends ISerializable {
    template: IRelationshipTemplate;
    responseSource: IRelationship | IMessage;
    response: IResponse;
    responseCreationDate?: ICoreDate;
}

@type("CreateAndCompleteOutgoingRequestFromRelationshipCreationChangeParameters")
export class CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
    extends Serializable
    implements ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
{
    @serialize()
    @validate()
    public template: RelationshipTemplate;

    @serialize({ unionTypes: [Relationship, Message] })
    @validate()
    public responseSource: Relationship | Message;

    @serialize()
    @validate()
    public response: Response;

    @serialize()
    @validate({ nullable: true })
    public responseCreationDate?: CoreDate;

    public static from(
        value: ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
    ): CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters {
        return this.fromAny(value);
    }
}
