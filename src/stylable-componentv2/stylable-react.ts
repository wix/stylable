
import { wrapSBRender } from './wrap-render';
import { StylableContext } from "./stylable-context";
import { Stylesheet } from "../stylesheet";

import { StylableComponent, SBStatelessComponent, StateLess, SBComponentProps } from "./types";

export const context = new StylableContext({ namespaceDivider: "▪" });

function SBComponent<T extends React.ComponentClass<any>>(Base: T, stylesheet: Stylesheet): StylableComponent<T>;
function SBComponent<T>(stylesheet: Stylesheet): Function;
function SBComponent<T extends React.ComponentClass<any>>(Base: T | Stylesheet, stylesheet?: Stylesheet) {
    if (!stylesheet) {
        return function(Component: T): StylableComponent<T> {
            return SBComponent(Component, Base as Stylesheet);
        }
    }    
    context.add(stylesheet);
    const Class = Base as any;
    Class.prototype.render = wrapSBRender(Class.prototype.render, stylesheet);
    Class.toString = function(){
        return stylesheet.namespace
    }    
    return Class;
}

function SBStateless<T, C = object>(renderFunction: StateLess<T, C>, stylesheet: Stylesheet): SBStatelessComponent<T> {
    context.add(stylesheet);
    const wrapped = wrapSBRender(renderFunction as StateLess<T, C>, stylesheet);
    wrapped.toString = function(){
        return stylesheet.namespace;
    }
    return wrapped;
}

function defineMixin<T>(name: string, mixinFunction: (options: T) => object){
    const mixinId = "@Mixins/" + name;
    context.registerMixin(mixinId, mixinFunction);
    (mixinFunction as any).toString = function(){
        return mixinId;
    }
    return mixinFunction;
}

export const attach = context.attach.bind(context);

export { SBComponent, SBStateless, defineMixin };

declare module 'react' {
    interface HTMLAttributes<T> extends SBComponentProps { }
}

