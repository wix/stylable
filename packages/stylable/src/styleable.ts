import { Stylesheet } from './stylesheet';
import { InMemoryContext } from "./in-memory-context";



export const styleable = {
    generate(styles: Stylesheet | Stylesheet[], context: InMemoryContext = new InMemoryContext({ namespaceDivider: "💠" })) {
        if (!Array.isArray(styles)) { styles = [styles]; }
        styles.forEach((style) => style.generate(context));
        return context.buffer;
    }
}
