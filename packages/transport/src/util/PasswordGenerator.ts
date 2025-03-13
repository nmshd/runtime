import { Random, RandomCharacterRange } from "@nmshd/core-types";

const defaultPasswordRange = RandomCharacterRange.AlphanumericEase + RandomCharacterRange.SpecialCharacters;

export interface IPasswordGenerator {}

export interface IPasswordGeneratorStatic {
    readonly elementsGerman: string[];
    readonly unitsGerman: string[];
    new (): IPasswordGenerator;
    createPassword(minLength: number, allowedCharacters?: string | string[], maxLength?: number): Promise<string>;
    createUnitPassword(): Promise<string>;
    createElementPassword(): Promise<string>;
}

export class PasswordGenerator implements IPasswordGenerator {
    public static readonly elementsGerman: string[] = [
        "Wasserstoff",
        "Helium",
        "Lithium",
        "Beryllium",
        "Bor",
        "Kohlenstoff",
        "Stickstoff",
        "Sauerstoff",
        "Fluor",
        "Neon",
        "Natrium",
        "Magnesium",
        "Aluminium",
        "Silicium",
        "Phosphor",
        "Schwefel",
        "Chlor",
        "Argon",
        "Kalium",
        "Calcium",
        "Scandium",
        "Titan",
        "Vanadium",
        "Chrom",
        "Mangan",
        "Eisen",
        "Cobalt",
        "Nickel",
        "Kupfer",
        "Zink"
    ];

    public static readonly unitsGerman: string[] = [
        "Kelvin",
        "Mol",
        "Candela",
        "Mikrosekunden",
        "Nanosekunden",
        "Millisekunden",
        "Sekunden",
        "Minuten",
        "Stunden",
        "Tage",
        "Wochen",
        "Monate",
        "Jahre",
        "Seemeilen",
        "Astronomische Einheiten",
        "Parsecs",
        "Lichtjahre",
        "Millimeter",
        "Zentimeter",
        "Meter",
        "Kilometer",
        "Quadratmeter",
        "Ar",
        "Hektar",
        "Milliliter",
        "Zentiliter",
        "Liter",
        "Kubikmeter",
        "Barrel",
        "Gramm",
        "Kilogramm",
        "Tonnen",
        "Pfund",
        "Zentner",
        "Knoten",
        "Newton",
        "Pascal",
        "Bar",
        "Joule",
        "Kilojoule",
        "Megajoule",
        "Wattstunden",
        "Kilowattstunden",
        "Megawattstunden",
        "Kalorien",
        "Kilokalorien",
        "Elektronenvolt",
        "Watt",
        "Kilowatt",
        "Megawatt",
        "Voltampere",
        "Ampere",
        "Milliampere",
        "Ohm",
        "Siemens",
        "Coulomb",
        "Amperestunde",
        "Milliamperestunde",
        "Farad",
        "Kelvin",
        "Grad Celsius",
        "Lumen",
        "Lux",
        "Bit",
        "Byte",
        "Kilobyte",
        "Megabyte",
        "Gigabyte",
        "Terabyte",
        "Etabyte"
    ];

    public static async createPassword(minLength: number, maxLength = 0, allowedCharacters: string | string[] = defaultPasswordRange): Promise<string> {
        if (maxLength <= 0) {
            maxLength = minLength;
        }
        return await Random.stringRandomLength(minLength, maxLength, allowedCharacters);
    }

    /**
     * Creates a "strong" password out of a scramble of the following character sets:
     *
     * - 1 special character out of RandomCharacterRange.SpecialCharacters
     * - 1 lowercase character out of RandomCharacterRange.LowerCaseEase
     * - 1 uppercase character out of RandomCharacterRange.UpperCaseEase
     * - 1 number out of RandomCharacterRange.DigitEase
     * - A random number of characters (between minLength and maxLength) out of PasswordRange.Default
     *
     */
    public static async createStrongPassword(minLength = 8, maxLength = 12): Promise<string> {
        if (minLength > maxLength) maxLength = minLength;
        if (minLength < 8) {
            throw new Error("Minimum password length for a strong password should be 8 characters.");
        }

        const specialCharacterBucket = {
            minLength: 1,
            maxLength: 1,
            allowedChars: RandomCharacterRange.SpecialCharacters
        };
        const lowercaseBucket = { minLength: 1, maxLength: 1, allowedChars: RandomCharacterRange.LowerCaseEase };
        const uppercaseBucket = { minLength: 1, maxLength: 1, allowedChars: RandomCharacterRange.UpperCaseEase };
        const numberBucket = { minLength: 1, maxLength: 1, allowedChars: "123456789" };
        const alphanumericBucket = {
            minLength: minLength - 4,
            maxLength: maxLength - 4,
            allowedChars: defaultPasswordRange
        };
        const password = await Random.stringWithBuckets([specialCharacterBucket, lowercaseBucket, uppercaseBucket, numberBucket, alphanumericBucket]);
        return await Random.scramble(password);
    }

    public static async createUnitPassword(): Promise<string> {
        const number1Bucket = { minLength: 1, maxLength: 1, allowedChars: "123456789" };
        const number2Bucket = { minLength: 0, maxLength: 2, allowedChars: "0123456789" };
        const commaBucket = { minLength: 0, maxLength: 1, allowedChars: "," };
        const number3Bucket = { minLength: 0, maxLength: 1, allowedChars: "0123456789" };
        const number4Bucket = { minLength: 1, maxLength: 1, allowedChars: "123456789" };
        const randomMetric = await Random.stringWithBuckets([number1Bucket, number2Bucket, commaBucket, number3Bucket, number4Bucket]);
        const unit = await this.createPassword(1, 0, this.unitsGerman);

        return `${randomMetric} ${unit}`;
    }

    public static async createElementPassword(): Promise<string> {
        const element = await this.createPassword(1, 0, this.elementsGerman);
        const number = await this.createPassword(1, 0, RandomCharacterRange.Digit);
        return `${element} ${number}`;
    }
}
