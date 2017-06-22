import { Stylesheet } from './stylesheet';
import { InMemoryContext } from "./in-memory-context";
export interface Options {
    namespaceDivider: string;
}

export const styleable = {
    generate(styles: Stylesheet | Stylesheet[], options: Options = {namespaceDivider: "💠"}) {
        if(!Array.isArray(styles)){ styles = [styles]; }
        const ctx = new InMemoryContext(options.namespaceDivider);
        styles.forEach((style) => style.generate(ctx));
        return ctx.buffer;
    }
}
