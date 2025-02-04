import { Serializable } from "@js-soft/ts-serval";
import _ from "lodash";

export class ExtendedSerializable extends Serializable {
    public getRequiredFeatures(): string[] {
        let unionSet: string[] = [];
        for (const key in this) {
            if (Array.isArray(this[key])) {
                this[key].forEach((v) => {
                    if (v instanceof ExtendedSerializable) {
                        const subSet = v.getRequiredFeatures();
                        unionSet = _.union(unionSet, subSet);
                    }
                });
            }
            if (this[key] instanceof ExtendedSerializable) {
                const subSet = (this as any)[key].getRequiredFeatures();
                unionSet = _.union(unionSet, subSet);
            }
        }
        return unionSet;
    }
}

// alternative: helper function getRequiredFeatures(object/array) recursively calls itself for each property of the object/item of the array and forms the union of the results. If an object has the property "getRequiredFeatures", this property is called instead.
