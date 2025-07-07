import { ISerializable, Serializable, type } from "@js-soft/ts-serval";
import { DateTime, DateTimeUnit, Duration, DurationLike, Interval } from "luxon";

export interface ICoreDate extends ISerializable {
    date: string;
}

@type("CoreDate")
export class CoreDate extends Serializable {
    private readonly _dateTime: DateTime;
    public get dateTime(): DateTime {
        return this._dateTime;
    }

    public get date(): string {
        return this.asValidDateTime.toISO();
    }

    public constructor(dateTime: DateTime | CoreDate = DateTime.utc()) {
        super();

        if (dateTime instanceof CoreDate) {
            this._dateTime = dateTime._dateTime;
            return;
        }

        this._dateTime = dateTime;
    }

    public static utc(): CoreDate {
        return new CoreDate(DateTime.utc());
    }

    public static local(): CoreDate {
        return new CoreDate(DateTime.local());
    }

    public equals(another: CoreDate): boolean {
        return this.dateTime.equals(another.dateTime);
    }

    public add(amount: number | Duration | DurationLike): CoreDate {
        return new CoreDate(this.dateTime.plus(amount));
    }

    public subtract(amount: number | Duration | DurationLike): CoreDate {
        return new CoreDate(this.dateTime.minus(amount));
    }

    public startOf(unitOfTime: DateTimeUnit): CoreDate {
        return new CoreDate(this.dateTime.startOf(unitOfTime));
    }

    public endOf(unitOfTime: DateTimeUnit): CoreDate {
        return new CoreDate(this.dateTime.endOf(unitOfTime));
    }

    public format(format: string): string {
        return this.dateTime.toFormat(format);
    }

    public isWithin(rangeMinusOrBoth: number | Duration | DurationLike, rangePlus?: number | Duration | DurationLike, other?: CoreDate, granularity?: DateTimeUnit): boolean {
        rangePlus ??= rangeMinusOrBoth;
        other ??= CoreDate.utc();

        const start = other.subtract(rangeMinusOrBoth);
        const end = other.add(rangePlus);

        if (granularity) {
            return this.dateTime.startOf(granularity) > start.dateTime.startOf(granularity) && this.dateTime.startOf(granularity) < end.dateTime.startOf(granularity);
        }

        return this.dateTime > start.dateTime && this.dateTime < end.dateTime;
    }

    public isBefore(other: CoreDate, granularity?: DateTimeUnit): boolean {
        if (granularity) return this.dateTime.startOf(granularity) < other.dateTime.startOf(granularity);

        return this.dateTime < other.dateTime;
    }

    public isAfter(other: CoreDate, granularity?: DateTimeUnit): boolean {
        if (granularity) return this.dateTime.startOf(granularity) > other.dateTime.startOf(granularity);

        return this.dateTime > other.dateTime;
    }

    public isSame(other: CoreDate, granularity?: DateTimeUnit): boolean {
        if (granularity) return this.dateTime.startOf(granularity).valueOf() === other.dateTime.startOf(granularity).valueOf();

        return this.dateTime.valueOf() === other.dateTime.valueOf();
    }

    public isSameOrAfter(other: CoreDate, granularity?: DateTimeUnit): boolean {
        if (granularity) return this.dateTime.startOf(granularity) >= other.dateTime.startOf(granularity);

        return this.dateTime >= other.dateTime;
    }

    public isSameOrBefore(other: CoreDate, granularity?: DateTimeUnit): boolean {
        if (granularity) return this.dateTime.startOf(granularity) <= other.dateTime.startOf(granularity);

        return this.dateTime <= other.dateTime;
    }

    public isBetween(start: CoreDate, end?: CoreDate, granularity?: DateTimeUnit): boolean {
        if (!end) return this.isAfter(start, granularity);

        return Interval.fromDateTimes(start.dateTime, end.dateTime).contains(this.dateTime);
    }

    public isExpired(): boolean {
        return this.isSameOrBefore(CoreDate.utc());
    }

    public compare(comparator: CoreDate): number {
        return this.dateTime.valueOf() - comparator.dateTime.valueOf();
    }

    public static min(date1: CoreDate, date2?: CoreDate): CoreDate {
        if (!date2 || date1.isBefore(date2)) return date1;
        return date2;
    }

    /**
     * Creates an ISO String.
     */
    public override toString(): string {
        return this.asValidDateTime.toISO();
    }

    public toISOString(): string {
        return this.asValidDateTime.toISO();
    }

    public override toLocaleString(): string {
        return this.dateTime.toLocaleString();
    }

    public override toJSON(): string {
        return this.asValidDateTime.toISO();
    }

    public override serialize(): string {
        return this.asValidDateTime.toISO();
    }

    private get asValidDateTime(): DateTime<true> {
        if (!this.dateTime.isValid) throw new Error("The date is invalid.");
        return this.dateTime as DateTime<true>;
    }

    protected static override preFrom(value: any): any {
        if (!value) throw new Error("The provided object is undefined and cannot be deserialized.");

        if (typeof value === "object") {
            if (!value.date) {
                if (typeof value.toISOString !== "function") {
                    throw new Error("The provided object doesn't have an 'toISOString' string method.");
                }

                const iso = value.toISOString();
                return DateTime.fromISO(iso, { zone: "utc" });
            }

            return DateTime.fromISO(value.date, { zone: "utc" });
        }

        if (typeof value === "number") return DateTime.fromMillis(value);

        if (typeof value === "string") return DateTime.fromISO(value, { zone: "utc" }).toUTC();

        throw new Error("The provided object is invalid and cannot be deserialized.");
    }

    public static from(value: ICoreDate | string | number): CoreDate {
        return this.fromAny(value);
    }
}
