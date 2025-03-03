import { CoreAddress } from "@nmshd/core-types";

export class TestIdentity {
    public static readonly CURRENT_IDENTITY = CoreAddress.from("{{CurrentAddress}}");
    public static readonly PEER = CoreAddress.from("{{Peer}}");
    public static readonly EMPTY = CoreAddress.from("{{Empty}}");
    public static readonly UNDEFINED = CoreAddress.from("{{Undefined}}");
    public static readonly SOMEONE_ELSE = CoreAddress.from("{{SomeoneElse}}");
}
