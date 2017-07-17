import { SBComponentProps } from "./src/stylable-component/component";

export * from './src/stylable-component/stylable-react';

declare module 'react' {
    interface HTMLAttributes<T> extends SBComponentProps { }
}

