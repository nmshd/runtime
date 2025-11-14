import { Serializable } from "@js-soft/ts-serval";
import * as _ from "lodash";
// @ts-expect-error
import { Matcher } from "ts-mockito/lib/matcher/type/Matcher";

export function objectWith<T extends Serializable>(expected: Partial<T>): any {
    return new PartialObjectMatcher(expected);
}

class PartialObjectMatcher<T extends Serializable> extends Matcher {
    public constructor(private readonly expected: Partial<T>) {
        super();
    }

    public match(actual: T): boolean {
        const actualAsJson = this.objectToJson(actual);

        const comparisonObject = { ...actualAsJson, ...this.expected };
        const comparisonObjectAsJson = this.objectToJson(comparisonObject);
        return _.isEqual(comparisonObjectAsJson, actualAsJson);
    }

    private objectToJson<T extends Serializable>(obj: T) {
        if ((obj as any).toJSON && typeof (obj as any).toJSON === "function") {
            return obj.toJSON();
        }

        return JSON.parse(JSON.stringify(obj));
    }

    public toString(): string {
        return `${JSON.stringify(this.expected)}`;
    }
}
