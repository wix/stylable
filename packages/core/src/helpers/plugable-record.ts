const type = Symbol();

export type PlugableRecord = Record<Key, unknown>;
export type Key<T = unknown> = symbol & { [type]: T };
export type Val<K extends Key> = K[typeof type];

export const plugableRecord = {
    key<T>(desc: string) {
        return Symbol(desc) as Key<T>;
    },
    set<K extends Key>(map: PlugableRecord, key: K, value: Val<K>) {
        map[key] = value;
    },
    get<K extends Key>(map: PlugableRecord, key: K): Val<K> | undefined {
        return map[key];
    },
    getAssure<K extends Key>(map: PlugableRecord, key: K): Val<K> {
        if (!map[key]) {
            throw new Error(`key ${key.description} is missing on map`);
        }
        return map[key];
    },
    getUnsafe<K extends Key>(map: PlugableRecord, key: K): Val<K> {
        return map[key];
    },
};
