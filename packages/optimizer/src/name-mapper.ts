export type Prefix = string;
export type Name = string;
export type MappedName = string;

export class NameMapper {
    public index = 0;
    public mapping: Record<Prefix, Record<Name, MappedName>> = {};
    public indexMapping: Record<Prefix, number> = {};
    public get(name: Name, prefix: Prefix) {
        this.indexMapping[prefix] || (this.indexMapping[prefix] = 0);
        const mapping = this.mapping[prefix] || (this.mapping[prefix] = {});
        return mapping[name] || (mapping[name] = prefix + this.indexMapping[prefix]++);
    }
}
