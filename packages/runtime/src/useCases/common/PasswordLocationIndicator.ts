type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
type IntRange<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

// TODO: naming
export enum PasswordLocationIndicatorStrings {
    RecoveryKit = 0,
    Self = 1,
    Letter = 2,
    RegistrationLetter = 3,
    Email = 4,
    SMS = 5,
    App = 6,
    Website = 7
}

export type PasswordLocationIndicator = keyof typeof PasswordLocationIndicatorStrings | IntRange<50, 100>;

// TODO: naming
// TODO: maybe we can move this to PasswordProtectionCreationParameters after all
export function convertPasswordProtection(passwordProtection: { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator }): {
    password: string;
    passwordIsPin?: true;
    passwordLocationIndicator?: number;
} {
    if (passwordProtection.passwordLocationIndicator === undefined) {
        return passwordProtection as { password: string; passwordIsPin?: true };
    }

    const numericPasswordLocationIndicator = mapPasswordLocationIndicatorStringToNumber(passwordProtection.passwordLocationIndicator);
    return { ...passwordProtection, passwordLocationIndicator: numericPasswordLocationIndicator };
}

function mapPasswordLocationIndicatorStringToNumber(value: PasswordLocationIndicator): number {
    if (typeof value === "number") return value;

    const numericValue = PasswordLocationIndicatorStrings[value];
    return numericValue;
}

// TODO: what about numbers like 30? -> should not appear
export function mapNumberToPasswordLocationIndicatorString(value: number): PasswordLocationIndicator {
    const passwordLocationIndicatorStringValues = Object.values(PasswordLocationIndicatorStrings);

    if (value >= 0 && value < passwordLocationIndicatorStringValues.length) {
        return PasswordLocationIndicatorStrings[value] as PasswordLocationIndicator;
    }

    return value as PasswordLocationIndicator;
}

// TODO: is this needed here or can it be moved directly to validator?
// TODO: toLowerCase
export function isValidPasswordLocationIndicator(value: unknown): boolean {
    if (typeof value !== "string" && typeof value !== "number") return false;

    if (typeof value === "string") {
        const isPasswordLocationIndicatorString = Object.keys(PasswordLocationIndicatorStrings).includes(value);
        const isRecoveryKit = value === "RecoveryKit";
        return isPasswordLocationIndicatorString && !isRecoveryKit;
    }

    const isInValidRange = value >= 50 && value <= 99;
    return isInValidRange;
}
