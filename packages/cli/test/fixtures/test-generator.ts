export class Generator {
    private count = 0;
    public generateImport(filePath: string) {
        return {
            default: 'Style' + this.count++
        };
    }
}
