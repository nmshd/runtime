/* eslint-disable jest/no-export */
import { SerializableBase } from "@js-soft/ts-serval";
import { AbstractAttributeValue } from "@nmshd/content";

export interface GenericValueTestParameters {
    testName: string;
    typeName: string;
    typeClass: SerializableHelperStatic;
    expectedJSON: object;
    valueJSON: object;
    valueVerboseJSON: object;
    valueInterface: object;
    valueString?: string;
}

abstract class SerializableHelperStatic {
    public abstract fromAny(value: any): SerializableBase;
}

export class GenericValueTest {
    public runParametrized(testParameters: GenericValueTestParameters): void {
        describe(`${testParameters.testName}`, function () {
            if (testParameters.valueString) {
                test("serializes as String", function () {
                    const deserialized = testParameters.typeClass.fromAny(testParameters.valueJSON);
                    expect(deserialized).toBeInstanceOf(AbstractAttributeValue);
                    expect(deserialized).toBeInstanceOf(testParameters.typeClass);
                    expect(`${deserialized}`).toBe(testParameters.valueString);
                });
            }

            test("deserializes by JSON", function () {
                const deserialized = testParameters.typeClass.fromAny(testParameters.valueJSON);
                expect(deserialized).toBeInstanceOf(AbstractAttributeValue);
                expect(deserialized).toBeInstanceOf(testParameters.typeClass);
                expect(deserialized.toJSON()).toStrictEqual(testParameters.expectedJSON);
            });

            test("deserializes by verbose JSON", function () {
                const deserialized = testParameters.typeClass.fromAny(testParameters.valueVerboseJSON);
                expect(deserialized).toBeInstanceOf(AbstractAttributeValue);
                expect(deserialized).toBeInstanceOf(testParameters.typeClass);
                expect(deserialized.toJSON()).toStrictEqual(testParameters.expectedJSON);
            });

            test("deserializes by Interface", function () {
                const deserialized = testParameters.typeClass.fromAny(testParameters.valueInterface);
                expect(deserialized).toBeInstanceOf(AbstractAttributeValue);
                expect(deserialized).toBeInstanceOf(testParameters.typeClass);
                expect(deserialized.toJSON()).toStrictEqual(testParameters.expectedJSON);
            });
        });
    }
}
