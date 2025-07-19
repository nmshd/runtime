import { CoreIdHelper } from "@nmshd/core-types";

export class ConsumptionIds {
    public static readonly draft = new CoreIdHelper("LCLDRF");
    public static readonly setting = new CoreIdHelper("LCLSET");

    public static readonly attribute = new CoreIdHelper("ATT");
    public static readonly request = new CoreIdHelper("REQ");
    public static readonly notification = new CoreIdHelper("NOT");
    public static readonly identityMetadata = new CoreIdHelper("IDM");
}
