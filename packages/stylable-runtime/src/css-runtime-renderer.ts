import { RuntimeStylesheet } from './types';
import { createDOMListRenderer, DOMListRenderer } from './keyed-list-renderer';
import { createCacheStyleNodeRenderer } from './cached-node-renderer';

declare global {
  interface Window {
    __stylable_renderer_global_counter?: number 
  }
}

export class RuntimeRenderer {
  styles: RuntimeStylesheet[] = [];
  stylesMap: { [id: string]: RuntimeStylesheet } = {};
  renderer: DOMListRenderer<RuntimeStylesheet, HTMLStyleElement> | null = null;
  window: typeof window | null = null;
  id: number | null = null;

  init(_window: typeof window) {
    if (this.window || !_window) {
      return;
    }

    _window.__stylable_renderer_global_counter =
      _window.__stylable_renderer_global_counter || 0;
    this.id = _window.__stylable_renderer_global_counter++;

    this.window = _window;
    this.renderer = createDOMListRenderer(
      createCacheStyleNodeRenderer({
        attrKey: "st-id" + (this.id ? "-" + this.id : ""),
        createElement: _window.document.createElement.bind(_window.document)
      })
    );
    this.update();
  }
  update = () => {
    if (this.renderer) {
      this.renderer.render(this.window!.document.head, this.styles);
    }
  }
  onRegister() {
    if (this.window) {
      this.window.requestAnimationFrame(this.update);
    }
  }
  register(stylesheet: RuntimeStylesheet) {
    const registered = this.stylesMap[stylesheet.$id];

    if (registered) {
      this.removeStyle(registered);
    }

    const i = this.findDepthIndex(stylesheet.$depth);
    this.styles.splice(i + 1, 0, stylesheet);
    this.stylesMap[stylesheet.$id] = stylesheet;
    this.onRegister();
  }
  removeStyle(stylesheet: RuntimeStylesheet) {
    const i = this.styles.indexOf(stylesheet);
    if (~i) {
      this.styles.splice(i, 1);
    }
    delete this.stylesMap[stylesheet.$id];
  }
  findDepthIndex(depth: number) {
    let index = this.styles.length;
    while (index--) {
      const stylesheet = this.styles[index];
      if (stylesheet.$depth <= depth) {
        return index;
      }
    }
    return index;
  }
  getStyles(ids: string[], sortIndexes: boolean) {
    return this.sortStyles(ids.map(id => this.stylesMap[id]), sortIndexes);
  }
  sortStyles(styles: RuntimeStylesheet[], sortIndexes = false) {
    const s = styles.slice();

    sortIndexes &&
      s.sort((a, b) => {
        return this.styles.indexOf(a) - this.styles.indexOf(b);
      });
    s.sort((a, b) => {
      return a.$depth - b.$depth;
    });
    return s;
  }
}
