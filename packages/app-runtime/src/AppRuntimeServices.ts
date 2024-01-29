import { RuntimeServices } from "@nmshd/runtime";
import { AppServices } from "./extensibility";

export interface AppRuntimeServices extends RuntimeServices {
    appServices: AppServices;
}
