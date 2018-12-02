export class Generator {
    private count = 0;
    public generateImport() {
        return {
            default: 'Style' + this.count++
        };
    }
}
