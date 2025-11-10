import { CryptoRandom, ICoreBuffer } from "@nmshd/crypto";
import { v4 as uuidv4 } from "uuid";

export enum RandomCharacterRange {
    Digit = "0123456789",
    DigitEase = "123456789",
    Hex = "0123456789ABCDEF",
    LowerCase = "abcdefghijklmnopqrstuvwxyz",
    LowerCaseEase = "abcdefghijkmnpqrstuvwxyz",
    UpperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    UpperCaseEase = "ABCDEFGHJKLMNPQRSTUVWXYZ",
    Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    Alphanumeric = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    // Without I, l, O, o, 0
    AlphanumericEase = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789",
    AlphanumericUpperCaseEase = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789",
    GermanUmlaut = "ÄÖÜäöü",
    SpecialCharacters = "!?-_.:,;#+"
}

export interface RandomCharacterBucket {
    minLength: number;
    maxLength: number;
    allowedChars: string | string[];
}

export interface IRandom {}

export interface IRandomStatic {
    new (): IRandom;
    bytes(length: number): Promise<ICoreBuffer>;
    int(length: number): Promise<number>;
    array(length: number): Promise<any>;
    uuid(): Promise<string>;
    scramble(input: string): Promise<string>;
    intBetween(min: number, max: number): Promise<number>;
    intRandomLength(minLength: number, maxLength: number): Promise<number>;
    scrambleWithBuckets(buckets: RandomCharacterBucket[]): Promise<string>;
    stringWithBuckets(buckets: RandomCharacterBucket[]): Promise<string>;
    string(length: number, allowedChars?: string | string[]): Promise<string>;
    stringRandomLength(minLength: number, maxLength: number, allowedChars?: string | string[]): Promise<string>;
}

export class Random implements IRandom {
    public static async bytes(length: number): Promise<ICoreBuffer> {
        return await CryptoRandom.bytes(length);
    }

    public static async int(length: number): Promise<number> {
        if (length > 21 || length <= 0) {
            throw new Error("Length must be between 1 and 21.");
        }
        return parseInt(await this.string(length, RandomCharacterRange.Digit));
    }

    public static async array(length: number): Promise<any> {
        return (await CryptoRandom.bytes(length)).toArray();
    }

    public static uuid(): string {
        return uuidv4();
    }

    public static async scramble(input: string): Promise<string> {
        const out = [];
        const inar = input.split("");
        const length = input.length;
        for (let i = 0; i < length - 1; i++) {
            const charAt = await Random.intBetween(0, length - 1 - i);
            out.push(inar.splice(charAt, 1)[0]);
        }
        out.push(inar[0]);
        return out.join("");
    }

    public static async intBetween(min: number, max: number): Promise<number> {
        if (max <= min) {
            throw new Error("Max must be larger than min.");
        }
        const diff = max - min + 1;
        const bitLength = Math.abs(Math.ceil(Math.log2(diff)));
        if (bitLength > 32) {
            throw new Error("The range between the numbers is too big, 32 bit is the maximum -> 4294967296");
        }
        const byteLength = Math.ceil(bitLength / 8);
        const bitMask = Math.pow(2, bitLength) - 1;
        const randomArray = await this.bytes(byteLength);

        let value = 0;
        let p = (byteLength - 1) * 8;
        for (let i = 0; i < byteLength; i++) {
            value += randomArray.buffer[i] * Math.pow(2, p);
            p -= 8;
        }
        value = value & bitMask;
        if (value >= diff) {
            return await this.intBetween(min, max);
        }
        return min + value;
    }

    public static async intRandomLength(minLength: number, maxLength: number): Promise<number> {
        if (maxLength > 21) {
            throw new Error("Max must be below 22.");
        }
        return parseInt(await this.stringRandomLength(minLength, maxLength, RandomCharacterRange.Digit));
    }

    public static async scrambleWithBuckets(buckets: RandomCharacterBucket[]): Promise<string> {
        const str = await this.stringWithBuckets(buckets);
        return await this.scramble(str);
    }

    public static async stringWithBuckets(buckets: RandomCharacterBucket[]): Promise<string> {
        const str = [];
        for (const bucket of buckets) {
            str.push(await this.stringRandomLength(bucket.minLength, bucket.maxLength, bucket.allowedChars));
        }
        return str.join("");
    }

    public static async string(length: number, allowedChars: string | string[] = RandomCharacterRange.Alphanumeric): Promise<string> {
        if (length <= 0) return "";
        if (allowedChars.length > 256) {
            throw new Error("Input exceeds maximum length of 256.");
        }
        const ar = [];
        const inputLength = allowedChars.length;
        const random = await this.array(length + 10);
        const max = 255 - (255 % inputLength);
        for (let i = 0; i < length; i++) {
            const nmb = random[i];
            if (nmb > max) {
                // Reject random value to remove bias if we are at the
                // upper (and incomplete end) of possible random values
                continue;
            }
            ar.push(allowedChars[nmb % inputLength]);
        }
        let retStr = ar.join("");
        if (retStr.length < length) {
            retStr += await this.string(length - retStr.length, allowedChars);
        }
        return retStr;
    }

    public static async stringRandomLength(minLength: number, maxLength: number, allowedChars?: string | string[]): Promise<string> {
        if (minLength > maxLength) {
            throw new Error("maxLength must be larger than minLength.");
        }

        if (minLength < 0) {
            throw new Error("minlength must not be less than zero.");
        }

        const length = maxLength > minLength ? await this.intBetween(minLength, maxLength) : maxLength;
        return await this.string(length, allowedChars);
    }
}
