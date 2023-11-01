export interface MicroElementList {
    length: number;
    [key: number]: MicroElement;
}

export class MicroElement {
    constructor(private tagName: string) {}
    private _attrs: Record<string, string> = {};
    private _children = new Array<MicroElement>();
    parentElement: MicroElement | null = null;
    textContent = '';
    get children(): MicroElementList {
        return this._children;
    }
    setAttribute(name: string, value: string): void {
        this._attrs[name] = String(value);
    }

    getAttribute(name: string): string | null {
        return this._attrs[name] || null;
    }

    replaceChild(newChild: MicroElement, oldChild: MicroElement): MicroElement {
        const index = this._children.indexOf(oldChild);
        if (index >= 0) {
            this._children.splice(index, 1, newChild);
            this.removeChild(oldChild);
        } else {
            throw new Error('Child node found in parent');
        }
        return oldChild;
    }

    insertBefore(newChild: MicroElement, refChild: MicroElement | null | undefined): void {
        newChild.remove();
        if (refChild) {
            const index = refChild ? this._children.indexOf(refChild) : -1;

            if (index >= 0) {
                this._children.splice(index, 0, newChild);
            } else {
                throw new Error('Child node found in parent');
            }
        } else {
            this._children.push(newChild);
        }
        newChild.parentElement = this;
    }

    removeChild(oldChild: MicroElement): void {
        const index = this._children.indexOf(oldChild);
        if (index >= 0) {
            this._children.splice(index, 1);
            oldChild.parentElement = null;
        }
    }

    appendChild(newChild: MicroElement): void {
        this.insertBefore(newChild, null);
    }
    remove(): void {
        this.parentElement?.removeChild(this);
    }

    querySelectorAll(selector: string): MicroElementList {
        // only one selector supported
        const m = selector.match(/style\[st_runtime="(.*?)"\]/);
        if (!m) {
            throw new Error('Not implemented ' + selector);
        }
        return this._children.filter(
            (c) => c.tagName === 'style' && c.getAttribute('st_runtime') === m[1]
        );
    }

    stylableIds() {
        return this._children.map((c) => c.getAttribute('st_id')).join(', ');
    }
}

export class MicroDocument {
    head = new MicroElement('head');
    createElement(tagName: string): MicroElement {
        return new MicroElement(tagName);
    }
}
