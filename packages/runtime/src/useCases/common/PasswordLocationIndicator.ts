type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
type IntRange<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

// TODO: use numeric enum or map
export enum PasswordLocationIndicatorStrings {
    RecoveryKit = "RecoveryKit",
    Self = "Self",
    Letter = "Letter",
    RegistrationLetter = "RegistrationLetter",
    Email = "Email",
    SMS = "SMS",
    App = "App",
    Website = "Website"
}

export type PasswordLocationIndicator = PasswordLocationIndicatorStrings | IntRange<50, 100>;

// TODO: naming
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

// TODO: maybe we can move this to PasswordProtectionCreationParameters after all
function mapPasswordLocationIndicatorStringToNumber(value: PasswordLocationIndicator): number {
    if (typeof value === "number") return value;

    const index = Object.values(PasswordLocationIndicatorStrings).indexOf(value);
    return index;
}

export function mapNumberToPasswordLocationIndicatorString(value: number): PasswordLocationIndicator {
    const passwordLocationIndicatorStringValues = Object.values(PasswordLocationIndicatorStrings);

    if (value >= 0 && value < passwordLocationIndicatorStringValues.length) {
        return passwordLocationIndicatorStringValues[value];
    }

    return value as PasswordLocationIndicator;
}

// TODO: is this needed here or can it be moved directly to validator?
// TODO: toLowerCase
export function isValidPasswordLocationIndicator(value: unknown): boolean {
    if (typeof value !== "string" && typeof value !== "number") return false;

    if (typeof value === "string") {
        const isPasswordLocationIndicatorString = Object.keys(PasswordLocationIndicatorStrings).includes(value);
        const isRecoveryKit = value === PasswordLocationIndicatorStrings.RecoveryKit;
        return isPasswordLocationIndicatorString && !isRecoveryKit;
    }

    const isInValidRange = value >= 50 && value <= 99;
    return isInValidRange;
}
