import { Stylesheet } from './stylesheet';
import { Generator } from "./generator";



export const styleable = {
    generate(styles: Stylesheet | Stylesheet[], generator: Generator = new Generator({ namespaceDivider: "💠" })) {
        if (!Array.isArray(styles)) { styles = [styles]; }
        styles.forEach((style) => style.generate(generator));
        return generator.buffer;
    }
}
