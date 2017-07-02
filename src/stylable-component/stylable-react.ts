import { Stylesheet as StyleableStylesheet } from '../index';
import { createSBComponentFactory, SBComponentProps } from './component';
import { createStyleableStylesheet, StylableContext } from "./create-styleable-stylesheet";

export { StylableContext, StyleableStylesheet };

export const { SBComponent, SBStateless, Stylesheet } = createSBComponentFactory(createStyleableStylesheet());

declare module 'react' {
    interface HTMLAttributes<T> extends SBComponentProps { }
}

