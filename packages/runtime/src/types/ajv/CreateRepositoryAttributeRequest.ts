import { ISO8601DateTimeString } from "../../useCases/common";

export interface CreateRepositoryAttributeRequest {
    content: {
        value: unknown;
        tags?: string[];
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}
