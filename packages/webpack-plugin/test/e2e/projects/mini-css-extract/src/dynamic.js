import { classes } from './dynamic.st.css';

export function Dynamic() {
    return `<div class="${classes.root}">Dynamic</div>`;
}

export const root = classes.root;
