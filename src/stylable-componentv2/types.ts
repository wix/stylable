
import { Pojo } from "../types";
import { Stylesheet } from "../stylesheet";

export type PartialStyle = any;
export type SBComponentProps = { className?: string | Pojo<boolean>, cssStates?: Pojo<boolean>, style?: PartialStyle };
export type SBStatelessComponent<T> = React.StatelessComponent<T & SBComponentProps> & { stylesheet: Stylesheet };
export type StylableComponent<T> = T & React.ComponentClass<SBComponentProps> & { stylesheet: Stylesheet }
export type StateLess<T, C> = (props: T, context: C) => JSX.Element | null;
