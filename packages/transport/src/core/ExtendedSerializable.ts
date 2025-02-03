import { Serializable } from "@js-soft/ts-serval";
import _ from "lodash";

export class ExtendedSerializable extends Serializable {
    public getRequiredProperties(): string[] {
        let unionSet: string[] = [];
        for (const key in this) {
            if (Array.isArray(this[key])) {
                this[key].forEach((v) => {
                    if (typeof v.getRequiredProperties === "function") {
                        const subSet = v.getRequiredProperties();
                        unionSet = _.union(unionSet, subSet);
                    }
                });
            }
            if (this.hasOwnProperty(key)) {
                if (typeof (this as any)[key].getRequiredProperties === "function") {
                    const subSet = (this as any)[key].getPropertySet();
                    unionSet = _.union(unionSet, subSet);
                }
            }
        }
        return unionSet;
    }
}
