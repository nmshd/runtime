import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IResponse, Response } from "@nmshd/content";
import { IMessage, IRelationshipChange, IRelationshipTemplate, Message, RelationshipChange, RelationshipTemplate } from "@nmshd/transport";

export interface ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters extends ISerializable {
    template: IRelationshipTemplate;
    responseSource: IRelationshipChange | IMessage;
    response: IResponse;
}

@type("CreateAndCompleteOutgoingRequestFromRelationshipCreationChangeParameters")
export class CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
    extends Serializable
    implements ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
{
    @serialize()
    @validate()
    public template: RelationshipTemplate;

    @serialize({ unionTypes: [RelationshipChange, Message] })
    @validate()
    public responseSource: RelationshipChange | Message;

    @serialize()
    @validate()
    public response: Response;

    public static from(
        value: ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
    ): CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters {
        return this.fromAny(value);
    }
}
