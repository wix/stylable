import { generateMetaFromCSS } from './meta-parser';
import { InMemoryContext, Stylesheet } from './stylesheet';

export const styleable = {
    create(css: string): Stylesheet {
        return new Stylesheet(generateMetaFromCSS(css));
    },
    generate(...styles: Stylesheet[]) {
        const ctx = new InMemoryContext();
        styles.forEach((style) => style.generate(ctx));
        return ctx.buffer;
    }
}
