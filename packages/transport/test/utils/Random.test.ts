import { Random, RandomCharacterRange } from "@nmshd/core-types";

describe("RandomTest", function () {
    describe("IntBetween", function () {
        test("should return a number between the min and max", async function () {
            for (let i = 1; i < 20; i++) {
                const n = await Random.intBetween(0, 1);
                expect(n).toBeLessThan(2);
                expect(n).toBeGreaterThan(-1);
            }
        });

        test("should return an even number across all possible values (0|1)", async function () {
            const buckets: number[] = [0, 0];
            const iterations = 10000;
            for (let i = 1; i < iterations; i++) {
                const n = await Random.intBetween(0, 1);
                switch (n) {
                    case 0:
                        buckets[0]++;
                        break;
                    case 1:
                        buckets[1]++;
                        break;
                    default:
                        throw new Error(`Value '${n}' is not in the range!`);
                }
            }

            expect(buckets[0]).toBeLessThan(iterations * 0.6);
            expect(buckets[0]).toBeGreaterThan(iterations * 0.4);
            expect(buckets[1]).toBeLessThan(iterations * 0.6);
            expect(buckets[1]).toBeGreaterThan(iterations * 0.4);
        });

        test("should return an even number across all possible values (0 to 100)", async function () {
            const buckets: number[] = [];
            const iterations = 10000;
            const min = 0;
            const max = 100;
            const diff = max - min + 1;

            for (let j = 0; j < diff; j++) {
                buckets[j] = 0;
            }

            for (let i = 1; i < iterations; i++) {
                const n = await Random.intBetween(min, max);
                buckets[n]++;
            }

            for (let j = 0; j < diff; j++) {
                expect(buckets[j]).toBeLessThan((iterations / diff) * 1.5);
                expect(buckets[j]).toBeGreaterThan((iterations / diff) * 0.5);
            }
        });

        test("should return a number between the min and max (small numbers)", async function () {
            for (let i = 1; i < 20; i++) {
                const n = await Random.intBetween(-20, 20);
                expect(n).toBeLessThan(21);
                expect(n).toBeGreaterThan(-21);
            }
        });

        test("should return a number between the min and max (very high max)", async function () {
            for (let i = 1; i < 20; i++) {
                const n = await Random.intBetween(0, 2 ^ (32 - 1));
                expect(n).toBeLessThan(2 ^ 32);
                expect(n).toBeGreaterThan(-1);
            }
        });

        test("should return a number between the min and max (very low min)", async function () {
            for (let i = 1; i < 20; i++) {
                const n = await Random.intBetween(-2 ^ (32 + 1), 0);
                expect(n).toBeLessThan(1);
                expect(n).toBeGreaterThan(-2 ^ 32);
            }
        });
    });

    describe("Scramble()", function () {
        test("should return a string with the same length", async function () {
            for (let i = 1; i < 20; i++) {
                const instring = "012345";
                const n = await Random.scramble(instring);
                expect(n).toHaveLength(instring.length);
            }
        });
    });

    describe("String()", function () {
        test("should return a string with a fixed length", async function () {
            for (let i = 1; i < 20; i++) {
                const n = await Random.string(1);
                expect(n).toHaveLength(1);
            }

            for (let i = 1; i < 20; i++) {
                const n = await Random.string(10);
                expect(n).toHaveLength(10);
            }

            for (let i = 1; i < 20; i++) {
                const n = await Random.string(100);
                expect(n).toHaveLength(100);
            }
        });

        test("should return a string with a fixed length and wanted characters", async function () {
            for (let i = 1; i < 20; i++) {
                const n = await Random.string(1, "a");
                expect(n).toHaveLength(1);
                expect(n).toBe("a");
            }

            for (let i = 1; i < 20; i++) {
                const n = await Random.string(10, "a");
                expect(n).toHaveLength(10);
                expect(n).toBe("aaaaaaaaaa");
            }

            for (let i = 1; i < 20; i++) {
                const n = await Random.string(10, "0");
                expect(n).toHaveLength(10);
                expect(n).toBe("0000000000");
            }
        });

        test("should return an even number across all possible values (Alphabet)", async function () {
            const buckets: any = {};
            const iterations = 10000;
            const diff = RandomCharacterRange.Alphabet.length;

            for (let i = 1; i < iterations; i++) {
                const n = await Random.string(1, RandomCharacterRange.Alphabet);
                if (buckets[n]) buckets[n]++;
                else buckets[n] = 1;
            }

            for (const char in buckets) {
                expect(buckets[char]).toBeLessThan((iterations / diff) * 1.5);
                expect(buckets[char]).toBeGreaterThan((iterations / diff) * 0.5);
            }
        });
    });
});
