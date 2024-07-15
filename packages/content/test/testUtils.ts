export function expectThrows(method: Function, errorMessage = ""): void {
    let error: Error | undefined;
    try {
        if (typeof method === "function") {
            method();
        }
    } catch (err: unknown) {
        if (!(err instanceof Error)) throw err;

        error = err;
    }

    expect(error, "No Error was thrown!").not.toBeNull();
    expect(error).toBeInstanceOf(Error);
    if (errorMessage) {
        expect(error!.message, `Error Message: ${error!.message}`).toMatch(new RegExp(`^${errorMessage}`));
    }
}

export async function expectThrowsAsync(method: Function | Promise<any>, customExceptionMatcher?: (e: Error) => void): Promise<void>;

export async function expectThrowsAsync(method: Function | Promise<any>, errorMessagePatternOrRegexp: RegExp): Promise<void>;

/**
 *
 * @param method The function which should throw the exception
 * @param errorMessagePattern the pattern the error message should match (asterisks ('\*') are wildcards that correspond to '.\*' in regex)
 */
export async function expectThrowsAsync(method: Function | Promise<any>, errorMessagePattern: string): Promise<void>;

export async function expectThrowsAsync(method: Function | Promise<any>, errorMessageRegexp: RegExp | string | ((e: Error) => void) | undefined): Promise<void> {
    let error: Error | undefined;
    try {
        if (typeof method === "function") {
            await method();
        } else {
            await method;
        }
    } catch (err: unknown) {
        if (!(err instanceof Error)) throw err;

        error = err;
    }

    expect(error, "Expected an error to be thrown").toBeInstanceOf(Error);

    if (!errorMessageRegexp) return;

    if (typeof errorMessageRegexp === "function") {
        errorMessageRegexp(error!);
        return;
    }

    if (typeof errorMessageRegexp === "string") {
        errorMessageRegexp = new RegExp(errorMessageRegexp.replaceAll("*", ".*"));
    }

    expect(error!.message).toMatch(new RegExp(errorMessageRegexp));
}
