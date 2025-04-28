type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
type IntRange<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

export enum PasswordLocationIndicatorOptions {
    RecoveryKit = 0,
    Self = 1,
    Letter = 2,
    RegistrationLetter = 3,
    Email = 4,
    SMS = 5,
    App = 6,
    Website = 7
}

export type PasswordLocationIndicator = keyof typeof PasswordLocationIndicatorOptions | IntRange<50, 100>;
