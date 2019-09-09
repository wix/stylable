import { RuntimeRenderer } from './css-runtime-renderer';
import { create as createNew } from './css-runtime-stylesheet';
import { AttributeMap, InheritedAttributes, StateMap, StylableExports } from './types';

// If you see this code and don't know anything about it don't change it.
// Because Barak made a custom bundler we can only support one api export name.
// In order to create legacy api support we allow duplicate export that we know we can override in the bundle.

const newCreate = createNew;

export function create(
    namespace: string,
    exports: StylableExports,
    css: string,
    depth: number,
    id: string | number,
    renderer: RuntimeRenderer | null
) {
    const stylesheet = newCreate(namespace, exports, css, depth, id, renderer);

    function $cssStates(stateMapping: StateMap) {
        return {
            className: stylesheet.cssStates(stateMapping)
        };
    }

    function $get(localName: string) {
        return stylesheet.classes[localName];
    }

    function $mapClasses(className: string) {
        return className
            .split(/\s+/g)
            .map(className => stylesheet.classes[className] || className)
            .join(' ');
    }

    function stylable_runtime_stylesheet(
        className: string,
        states?: StateMap,
        inheritedAttributes?: InheritedAttributes
    ) {
        className = className ? $mapClasses(className) : '';

        if (states) {
            const stateClasses = stylesheet.cssStates(states);
            if (stateClasses) {
                className += className ? ' ' + stateClasses : stateClasses;
            }
        }

        const base: AttributeMap = {};
        if (inheritedAttributes) {
            for (const k in inheritedAttributes) {
                if (k.match(/^data-/)) {
                    base[k] = inheritedAttributes[k];
                }
            }
            if (inheritedAttributes.className) {
                className += className
                    ? ' ' + inheritedAttributes.className
                    : inheritedAttributes.className;
            }
        }
        if (className) {
            base.className = className;
        }
        return base;
    }

    Object.setPrototypeOf(stylable_runtime_stylesheet, {
        $root: 'root',
        ...stylesheet.stVars,
        ...stylesheet.classes,
        $namespace: stylesheet.namespace,
        $depth: stylesheet.$depth,
        $id: stylesheet.$id,
        $css: stylesheet.$css,
        $get,
        $cssStates
    });
    // EDGE CACHE BUG FIX
    (stylable_runtime_stylesheet as any).root = stylesheet.classes.root;

    (stylable_runtime_stylesheet as any).originStylesheet = stylesheet;

    return stylable_runtime_stylesheet;
}
