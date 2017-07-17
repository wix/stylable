
import { wrapSBRender } from './wrap-render';
import { StylableContext } from "./stylable-context";
import { Stylesheet } from "../stylesheet";

import { StylableComponent, SBStatelessComponent, StateLess } from "./types";

export type StylesheetInput = Stylesheet | {$stylesheet: Stylesheet};

export const context = new StylableContext({ namespaceDivider: "▪" });

function SBComponent<T extends React.ComponentClass<any>>(Base: T, stylesheet: StylesheetInput): StylableComponent<T>;
function SBComponent<T>(stylesheet: StylesheetInput): Function;
function SBComponent<T extends React.ComponentClass<any>>(Base: T | StylesheetInput, stylesheet?: StylesheetInput) {
    if (!stylesheet) {
        return function (Component: T): StylableComponent<T> {
            return SBComponent(Component, Base as Stylesheet);
        }
    }
    const sheet =  (<{$stylesheet: Stylesheet}>stylesheet).$stylesheet || stylesheet;
    const Class = Base as any;
    Class.prototype.render = wrapSBRender(Class.prototype.render, sheet);
    Class.toString = function () { return sheet.namespace; }
    context.add(sheet); //WAT
    return Class;
}

function SBStateless<T, C = object>(renderFunction: StateLess<T, C>, stylesheet: StylesheetInput): SBStatelessComponent<T> {
    const sheet =  (<{$stylesheet: Stylesheet}>stylesheet).$stylesheet || stylesheet;
    const wrapped = wrapSBRender(renderFunction as StateLess<T, C>, sheet);
    wrapped.toString = function () { return sheet.namespace; }
    context.add(sheet); //WAT
    return wrapped;
}

function defineMixin<T>(name: string, mixinFunction: (options: T) => object) {
    const mixinId = "@Mixins/" + name;
    (mixinFunction as any).toString = function () { return mixinId; }
    context.registerMixin(mixinId, mixinFunction);
    return mixinFunction;
}

export const attach = context.attach.bind(context);

export { SBComponent, SBStateless, defineMixin };
