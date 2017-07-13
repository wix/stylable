import { Stylesheet as StyleableStylesheet } from '../index';
import { createSBComponentFactory, SBComponentProps } from './component';
import { createStyleableStylesheet, StylableContext } from "./create-styleable-stylesheet";

export { StylableContext, StyleableStylesheet };

export const { SBComponent, SBStateless, Stylesheet, defineMixin } = createSBComponentFactory(createStyleableStylesheet());

export { Resolver } from "../resolver";
export { Generator, DEFAULT_CONFIG, Config } from "../generator";
export { objectifyCSS } from "../parser";

declare module 'react' {
    interface HTMLAttributes<T> extends SBComponentProps { }
}

