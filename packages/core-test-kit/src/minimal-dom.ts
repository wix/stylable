export class MinimalDocument {
    private html = new MinimalElement('html');
    public head = new MinimalElement('head');
    public body = new MinimalElement('body');
    constructor() {
        this.html.append(this.head);
        this.html.append(this.body);
    }
    createElement(tagName: string): MinimalElement {
        return new MinimalElement(tagName);
    }
}

export interface MinimalElementList {
    length: number;
    item: (index: number) => MinimalElement;
    [key: number]: MinimalElement;
}

export class MinimalElement {
    constructor(private _tagName: string) {}
    private _attrs: Record<string, string> = { class: '' };
    protected _children = new Array<MinimalElement>();
    public classList = new ClassList((newValue) => (this._attrs['class'] = newValue));
    public parentElement: MinimalElement | null = null;
    public textContent = '';

    get children(): MinimalElementList {
        return wrapArrayAsMinimalElementList([...this._children]);
    }
    get tagName() {
        return this._tagName.toUpperCase();
    }
    get className() {
        return this._attrs['class'] || '';
    }
    get nextElementSibling(): MinimalElement | null {
        if (!this.parentElement) {
            return null;
        }
        const index = this.parentElement._children.indexOf(this);
        return this.parentElement._children[index + 1] || null;
    }
    public setAttribute(name: string, value: string): void {
        if (name === 'class') {
            this.classList.add(...value.replace(/\s+/g, ' ').split(' '));
        } else {
            this._attrs[name] = String(value);
        }
    }

    public getAttribute(name: string): string | null {
        return this._attrs[name] || null;
    }
    public hasAttribute(name: string) {
        return this._attrs[name] !== undefined;
    }

    public replaceChild(newChild: MinimalElement, oldChild: MinimalElement): MinimalElement {
        const index = this._children.indexOf(oldChild);
        if (index >= 0) {
            this._children.splice(index, 1, newChild);
            this.removeChild(oldChild);
        }
        return oldChild;
    }

    public insertBefore(newChild: MinimalElement, refChild?: MinimalElement): void {
        newChild.remove();
        const index = refChild ? this._children.indexOf(refChild) : -1;
        if (index >= 0) {
            this._children.splice(index, 0, newChild);
        } else {
            this._children.push(newChild);
        }
        newChild.parentElement = this;
    }

    public removeChild(oldChild: MinimalElement): void {
        const index = this._children.indexOf(oldChild);
        if (index >= 0) {
            this._children.splice(index, 1);
            oldChild.parentElement = null;
        }
    }

    public append(newChild: MinimalElement): void {
        this.insertBefore(newChild);
    }
    public remove(): void {
        this.parentElement?.removeChild(this);
    }
    public querySelector(_selector: string) {
        throw new Error('querySelector is not implemented.');
    }
    public querySelectorAll(selector: string): MinimalElementList {
        // only one selector supported
        const m = selector.match(/style\[st_runtime="(.*?)"\]/);
        if (!m) {
            throw new Error('Not implemented ' + selector);
        }
        return wrapArrayAsMinimalElementList(
            this._children.filter(
                (c) => c.tagName === 'style' && c.getAttribute('st_runtime') === m[1]
            )
        );
    }
}

function wrapArrayAsMinimalElementList(arr: MinimalElement[]) {
    const castList = arr as unknown as MinimalElementList;
    castList.item = (index: number) => arr[index];
    return castList;
}

class ClassList {
    private classes = new Set<string>();
    constructor(private setClassAttr: (value: string) => void) {}
    public contains(className: string) {
        return this.classes.has(className);
    }
    public add(...classNames: string[]) {
        classNames.forEach((name) => this.classes.add(name));
        this.setClassAttr([...this.classes].join(' '));
    }
    public remove(...classNames: string[]) {
        classNames.forEach((name) => this.classes.delete(name));
        this.setClassAttr([...this.classes].join(' '));
    }
    public forEach(cb: (className: string) => void) {
        for (const className of this.classes) {
            cb(className);
        }
    }
}
