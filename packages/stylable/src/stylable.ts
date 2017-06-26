import { Stylesheet } from './stylesheet';
import { Generator } from "./generator";

export const stylable = {
    generate(styles: Stylesheet | Stylesheet[], generator: Generator = new Generator({})) {
        if (!Array.isArray(styles)) { styles = [styles]; }
        styles.forEach((style) => generator.addEntry(style));
        return generator.buffer;
    }
}
