import { render } from 'react-dom';
import { StylableContext as StylesheetContext } from "./create-styleable-stylesheet";

let root = document.getElementById('root') || document.createElement('div');
root.id = "root";

function append() {
    if (!root.parentElement) {
        document.body.appendChild(root);
    }
}
export function renderRoot(el: JSX.Element, context: StylesheetContext, theme?: {[key: string]: string}) {
    append();
    context.attach(theme);
    return render(el, root);
}
