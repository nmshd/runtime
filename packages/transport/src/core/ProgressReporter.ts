export class ProgressReporter<T extends string> {
    public constructor(private readonly callback?: (currentPercentage: number, currentStep: T) => void) {}

    public createStep(stepName: T, totalNumberOfItemsInStep = -1): ProgressReporterStep<T> {
        return new ProgressReporterStep(stepName, totalNumberOfItemsInStep, this.callback);
    }
}
export class ProgressReporterStep<T extends string> {
    private currentItem: number;
    public constructor(
        public readonly name: T,
        private totalNumberOfItems: number,
        private readonly callback?: (currentPercentage: number, currentStep: T) => void
    ) {
        if (totalNumberOfItems > 0) this.progressTo(0);
    }

    public progress(): void {
        this.progressTo(this.currentItem + 1);
    }

    public progressTo(itemIndex: number): void {
        this.currentItem = itemIndex;
        this.callback?.(Math.round((itemIndex / this.totalNumberOfItems) * 100), this.name);
    }

    public incrementTotalNumberOfItems(): void {
        this.updateTotalNumberOfItems(this.totalNumberOfItems + 1);
    }

    public updateTotalNumberOfItems(newValue: number): void {
        this.totalNumberOfItems = newValue;
    }

    public finish(): void {
        if (this.currentItem < this.totalNumberOfItems) this.progressTo(this.totalNumberOfItems);
    }

    public manualReport(percentage: number): void {
        this.callback?.(percentage, this.name);
    }
}
