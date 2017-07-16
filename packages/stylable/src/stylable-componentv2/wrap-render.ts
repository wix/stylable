
import * as React from "react";
import { SBStatelessComponent } from "./types";


export function classNames(...nodes: Array<string | undefined | null>): string {
    return nodes.filter((x) => !!x).join(' ');
}

/**
 * 
 * wrapSBRender is super super naive approach to create the component and highly experimental
 * but it works for testing....;) 
 */
export function wrapSBRender<T, C = object>(renderFunction: (props: T, context: C) => JSX.Element | null, sheet: any): SBStatelessComponent<T> {
    
    const createEl = createStylableCreateElement(sheet);

    const Component = function (this: any, props: any, context: C) {
        props = props || this.props || {}
        context = context || this.context || {}
        const ReactSpooned = React as any;
        const sbCreateElement = ReactSpooned.createElement;
        let root: JSX.Element | null = null;
        try {
            ReactSpooned.createElement = createEl;
            root = renderFunction.call(this, props, context);
            root = root && React.cloneElement(root, {
                ...sheet.cssStates({ ...root.props.cssStates, ...props.cssStates }),
                className: classNames(sheet.get(sheet.root), root.props.className, props.className),
                style: { ...root.props.style, ...props.style }
            });
        } finally {
            ReactSpooned.createElement = sbCreateElement;
        }
        return root;
    } as SBStatelessComponent<T>

    Component.stylesheet = sheet;

    return Component;
}


const originalCreateElement = React.createElement;
function createStylableCreateElement(sheet: any) {
    return function stylableCreateElement(type: any, props: any, ...children: any[]) {
        
        if (props) {
            if (typeof props.className === 'string') {
                props.className = props.className.split(' ').map((name: string) => sheet.get(name) || name).join(' ');
            } else if (typeof props.className === 'object') {
                props.className = Object.keys(props.className)
                    .filter((className) => props.className[className])
                    .map((name: string) => sheet.get(name) || name).join(' ');
            }
            if (typeof type === 'string' && props.cssStates) {
                const { cssStates, ...otherProps } = props;
                props = { ...sheet.cssStates(cssStates), ...otherProps }
            }
        }
        return originalCreateElement(type, props, ...children);
    }
}