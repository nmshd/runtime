import { Serializable, serialize, validate } from "@js-soft/ts-serval";

export class PublicRelationshipTemplateReference extends Serializable {
    @serialize()
    @validate()
    public title: string;

    @serialize()
    @validate()
    public description: string;

    @serialize()
    @validate()
    public truncatedReference: string;
}
