/* eslint-disable no-var */
import type { Host } from './types';

export function injectStyles(host: Host) {
    function stylableRuntime(
        namespace: string,
        css: string,
        depth: number,
        runtimeId: string
    ): void {
        if (typeof document === 'undefined') {
            return;
        }
        var d = document;
        var head = d.head;
        var style = d.createElement('style');
        style.setAttribute('st_id', namespace);
        style.setAttribute('st_depth', depth as unknown as string);
        style.setAttribute('st_runtime', runtimeId);
        style.textContent = css;
        var loadedStyleElements = head.querySelectorAll<HTMLStyleElement>(
            'style[st_runtime="' + runtimeId + '"]'
        );
        var inserted = false;
        for (var i = 0; i < loadedStyleElements.length; i++) {
            var styleElement = loadedStyleElements[i];
            var stId = styleElement.getAttribute('st_id');
            var stDepth = Number(styleElement.getAttribute('st_depth'));
            if (stId === namespace) {
                if (stDepth === depth) {
                    head.replaceChild(style, styleElement);
                    return;
                } else {
                    styleElement.parentElement!.removeChild(styleElement);
                }
            }
            if (!inserted && depth < stDepth) {
                head.insertBefore(style, styleElement);
                inserted = true;
            }
        }
        if (!inserted) {
            head.append(style);
        }
    }
    host.sti = stylableRuntime;
}
