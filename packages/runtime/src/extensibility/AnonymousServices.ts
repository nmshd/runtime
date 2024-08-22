import { Inject } from "typescript-ioc";
import { AnonymousTokensFacade, BackboneCompatibilityFacade } from "./facades/anonymous";

export class AnonymousServices {
    public constructor(
        @Inject public readonly tokens: AnonymousTokensFacade,
        @Inject public readonly version: BackboneCompatibilityFacade
    ) {}
}
