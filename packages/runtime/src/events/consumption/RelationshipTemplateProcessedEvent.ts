import { RelationshipTemplateDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class RelationshipTemplateProcessedEvent extends DataEvent<RelationshipTemplateProcessedEventData> {
    public static readonly namespace = "consumption.relationshipTemplateProcessed";

    public constructor(eventTargetAddress: string, data: RelationshipTemplateProcessedEventData) {
        super(RelationshipTemplateProcessedEvent.namespace, eventTargetAddress, data);

        if (data.template.isOwn) throw new Error("Cannot create this event for an own Relationship Template.");
    }
}

export enum RelationshipTemplateProcessedResult {
    ManualRequestDecisionRequired = "ManualRequestDecisionRequired",
    NonCompletedRequestExists = "NonCompletedRequestExists",
    RelationshipExists = "RelationshipExists",
    NoRequest = "NoRequest",
    Error = "Error"
}

export type RelationshipTemplateProcessedEventData =
    | {
          template: RelationshipTemplateDTO;
          result: RelationshipTemplateProcessedResult.ManualRequestDecisionRequired;
          requestId: string;
      }
    | {
          template: RelationshipTemplateDTO;
          result: RelationshipTemplateProcessedResult.NonCompletedRequestExists;
          requestId: string;
      }
    | {
          template: RelationshipTemplateDTO;
          result: RelationshipTemplateProcessedResult.RelationshipExists;
          relationshipId: string;
      }
    | {
          template: RelationshipTemplateDTO;
          result: RelationshipTemplateProcessedResult.NoRequest;
      }
    | {
          template: RelationshipTemplateDTO;
          result: RelationshipTemplateProcessedResult.Error;
      };
