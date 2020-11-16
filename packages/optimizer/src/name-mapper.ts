type Prefix = string;
type Name = string;
type MappedName = string;

export class NameMapper {
    public index: number;
    public mapping: Record<Prefix, Record<Name, MappedName>>;
    public indexMapping: Record<Prefix, number>;
    constructor() {
        this.index = 0;
        this.mapping = {};
        this.indexMapping = {};
    }
    public get(name: Name, prefix: Prefix) {
        this.indexMapping[prefix] || (this.indexMapping[prefix] = 0);
        const mapping = this.mapping[prefix] || (this.mapping[prefix] = {});
        return mapping[name] || (mapping[name] = prefix + this.indexMapping[prefix]++);
    }
}
