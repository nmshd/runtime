import { Inject } from "@nmshd/typescript-ioc";
import { AnonymousTokensFacade, BackboneCompatibilityFacade } from "./facades/anonymous/index.js";

export class AnonymousServices {
    public constructor(
        @Inject public readonly tokens: AnonymousTokensFacade,
        @Inject public readonly backboneCompatibility: BackboneCompatibilityFacade
    ) {}
}
