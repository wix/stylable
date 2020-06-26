import { CompA } from '../compA/a';
import { classes } from './b.st.css';

export function CompB() {
    return CompA({ className: classes.root, children: '<h1>Hello Form B</h1>' });
}
