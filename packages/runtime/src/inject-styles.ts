/* eslint-disable no-var */
import type { Host } from './types';

export function injectStyles(host: Host) {
    function stylableRuntime(id: string, css: string, depth: number, runtimeId: string): void {
        if (typeof document === 'undefined') {
            return;
        }
        var d = document;
        var head = d.head;
        var style = d.createElement('style');
        style.setAttribute('st_id', id);
        style.setAttribute('st_depth', depth as unknown as string);
        style.setAttribute('st_runtime', runtimeId);
        style.textContent = css;
        var loadedStyleElements = head.querySelectorAll<HTMLStyleElement>(
            'style[st_runtime="' + runtimeId + '"]'
        );
        var inserted = false;
        var insertAfter: HTMLElement | undefined;
        for (var i = 0; i < loadedStyleElements.length; i++) {
            var styleElement = loadedStyleElements[i];
            var existingStId = styleElement.getAttribute('st_id');
            var existingStDepth = Number(styleElement.getAttribute('st_depth'));
            if (existingStId === id) {
                if (existingStDepth === depth) {
                    head.replaceChild(style, styleElement);
                    return;
                } else {
                    styleElement.parentElement!.removeChild(styleElement);
                    continue;
                }
            }
            if (!inserted && depth < existingStDepth) {
                head.insertBefore(style, styleElement);
                inserted = true;
            }
            insertAfter = styleElement;
        }
        if (!inserted) {
            insertAfter
                ? head.insertBefore(style, insertAfter.nextElementSibling)
                : head.appendChild(style);
        }
    }
    host.sti = stylableRuntime;
    return host;
}
