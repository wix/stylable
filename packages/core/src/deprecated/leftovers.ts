import type { MappedStates } from '../features';

/**@deprecated */
export interface TypedClass {
    '-st-root'?: boolean;
    '-st-states'?: string[] | MappedStates;
    '-st-extends'?: string;
}
