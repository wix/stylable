import { classes } from './a.st.css';

export function CompA({ className, children }) {
    return `<div class="${classes.root + ' ' + className}">CompA ${children}</div>`;
}
