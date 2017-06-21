import { InMemoryContext, Stylesheet } from './stylesheet';

export const styleable = {
    generate(...styles: Stylesheet[]) {
        const ctx = new InMemoryContext();
        styles.forEach((style) => style.generate(ctx));
        return ctx.buffer;
    }
}
