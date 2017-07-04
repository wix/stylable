export type PartialStyle = any;

import * as React from "react";
import { Stylesheet } from '../index';
import { StylableContext, StylesheetWithContext, Pojo } from "./create-styleable-stylesheet";

export type SBComponentProps = { className?: string | Pojo<boolean>, cssStates?: Pojo<boolean>, style?: PartialStyle };
export type SBStatelessComponent<T> = React.StatelessComponent<T & SBComponentProps> & { stylesheet: Stylesheet };
export type StylableComponent<T> = T & React.ComponentClass<SBComponentProps> & { stylesheet: Stylesheet }
export type StateLess<T, C> = (props: T, context: C) => JSX.Element | null;
export type SBComponentType<T> = T & {
    context: StylableContext;
}


export function classNames(...nodes: Array<string | undefined | null>): string {
    return nodes.filter((x) => !!x).join(' ');
}

/**
 * 
 * wrapSBRender is super super naive approach to create the component and highly experimental
 * but it works for testing....;) 
 */
export function wrapSBRender<T, C = object>(renderFunction: (props: T, context: C) => JSX.Element | null, sheet: any): SBStatelessComponent<T> {

    const Component = function (this: any, props: any, context: C) {
        props = props || this.props || {}
        context = context || this.context || {}
        const ReactSpooned = React as any;
        const sbCreateElement = ReactSpooned.createElement;
        let root = null;
        try {
            ReactSpooned.createElement = function (type: any, props: any, ...children: any[]) {
                if (props) {
                    if (typeof props.className === 'string') {
                        props.className = props.className.split(' ').map((name: string) => sheet.get(name) || name).join(' ');
                    } else if (typeof props.className === 'object') {
                        props.className = Object.keys(props.className)
                            .filter((className) => props.className[className])
                            .map((name: string) => sheet.get(name) || name).join(' ');
                    }
                    if (typeof type === 'string' && props.cssStates) {
                        const {cssStates, ...otherProps} = props;
                        props = { ...sheet.cssStates(cssStates), ...otherProps }
                    }
                }
                return sbCreateElement(type, props, ...children);
            }
            root = renderFunction.call(this, props, context);
            root = root && React.cloneElement(root, {
                ...sheet.cssStates({ ...root.props.cssStates, ...props.cssStates }),
                className: classNames(sheet.get(sheet.root), root.props.className, props.className),
                style: { ...root.props.style, ...props.style }
            });
        } finally {
            ReactSpooned.createElement = sbCreateElement;
        }
        return root as JSX.Element;
    } as SBStatelessComponent<T>

    Component.stylesheet = sheet;

    return Component;
}

export function createSBComponentFactory(Stylesheet: StylesheetWithContext) {

    function SBComponent<T extends React.ComponentClass<any>>(Base: T, def: string | Stylesheet): StylableComponent<T>;
    function SBComponent<T>(def: string | Stylesheet): Function;
    function SBComponent<T extends React.ComponentClass<any>>(Base: any, def?: any) {
        if (!def) {
            return function(Component: T): StylableComponent<T> {
                return SBComponent(Component, Base);
            }
        }
        const stylesheet = ((def as any)._kind === 'Stylesheet' ? def : Stylesheet.fromCSS(def as string)) as Stylesheet;
        (Base as any).stylesheet = stylesheet;
        Base.prototype.render = wrapSBRender(Base.prototype.render, stylesheet);
        Base.toString = function(){
            return Base.stylesheet.namespace
        }
        const returnType: any = Base;
        return returnType;
    }

    function SBStateless<T, C = object>(renderFunction: StateLess<T, C>, def: string | Stylesheet): SBStatelessComponent<T> {
        const stylesheet = ((def as any)._kind === 'Stylesheet' ? def : Stylesheet.fromCSS(def as string));
        return wrapSBRender(renderFunction, stylesheet);
    }

    function defineMixin<T>(name: string, mixinFunction: (options: T) => object){
        const mixinId = "@Mixins/" + name;
        Stylesheet.context.registerMixin(mixinId, mixinFunction);
        (mixinFunction as any).toString = function(){
            return mixinId;
        }
        return mixinFunction;
    }

    return {
        SBStateless: copyContext(SBStateless, Stylesheet),
        SBComponent: copyContext(SBComponent, Stylesheet),
        Stylesheet,
        defineMixin
    };
}

export function copyContext<T extends SBComponentType<any> | SBStatelessComponent<any>>(SBComponent: T, Stylesheet: StylesheetWithContext): SBComponentType<T> {
    const target: any = SBComponent;
    target.context = Stylesheet.context;
    return target;
}
