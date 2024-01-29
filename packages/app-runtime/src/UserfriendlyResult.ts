import { Result } from "@js-soft/ts-utils";
import { UserfriendlyApplicationError } from "./UserfriendlyApplicationError";

export class UserfriendlyResult<T> extends Result<T, UserfriendlyApplicationError> {}
