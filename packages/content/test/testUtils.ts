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
