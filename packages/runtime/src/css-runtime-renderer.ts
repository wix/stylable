import { CacheStyleNodeRenderer } from './cached-node-renderer';
import { createDOMListRenderer, DOMListRenderer } from './keyed-list-renderer';
import type { RenderableStylesheet } from './types';

declare global {
    interface Window {
        __stylable_renderer_global_counter?: number;
    }
}

export class RuntimeRenderer {
    public styles: RenderableStylesheet[] = [];
    public stylesMap: { [id: string]: RenderableStylesheet } = {};
    public renderer: DOMListRenderer<RenderableStylesheet, HTMLStyleElement> | null = null;
    public window: Window | null = null;
    public id: number | null = null;

    public init(_window: Window) {
        if (this.window || !_window) {
            return;
        }

        _window.__stylable_renderer_global_counter =
            _window.__stylable_renderer_global_counter || 0;
        this.id = _window.__stylable_renderer_global_counter++;

        this.window = _window;
        this.renderer = createDOMListRenderer(
            new CacheStyleNodeRenderer({
                attrKey: 'st-id' + (this.id ? '-' + this.id : ''),
                createElement: _window.document.createElement.bind(_window.document),
            })
        );
        this.update();
    }
    public update = () => {
        if (this.renderer) {
            this.renderer.render(this.window!.document.head, this.styles);
        }
    };
    public onRegister() {
        if (this.window) {
            this.window.requestAnimationFrame(this.update);
        }
    }
    public register(stylesheet: RenderableStylesheet) {
        const registered = this.stylesMap[stylesheet.$id];

        if (registered) {
            this.removeStyle(registered);
        }

        const i = this.findDepthIndex(stylesheet.$depth);
        this.styles.splice(i + 1, 0, stylesheet);
        this.stylesMap[stylesheet.$id] = stylesheet;
        this.onRegister();
    }
    public removeStyle(stylesheet: RenderableStylesheet) {
        const i = this.styles.indexOf(stylesheet);
        if (~i) {
            this.styles.splice(i, 1);
        }
        delete this.stylesMap[stylesheet.$id];
    }
    public findDepthIndex(depth: number) {
        let index = this.styles.length;
        while (index--) {
            const stylesheet = this.styles[index];
            if (stylesheet.$depth <= depth) {
                return index;
            }
        }
        return index;
    }
    public getStyles(ids: string[], sortIndexes: boolean) {
        return this.sortStyles(
            ids.map((id) => this.stylesMap[id]),
            sortIndexes
        );
    }
    public sortStyles(styles: RenderableStylesheet[], sortIndexes = false) {
        const s = styles.slice();

        if (sortIndexes) {
            s.sort((a, b) => {
                return this.styles.indexOf(a) - this.styles.indexOf(b);
            });
        }

        s.sort((a, b) => {
            return a.$depth - b.$depth;
        });
        return s;
    }
}
// The $ export is a convention with the webpack plugin if changed both needs a change
export const $ = new RuntimeRenderer();
