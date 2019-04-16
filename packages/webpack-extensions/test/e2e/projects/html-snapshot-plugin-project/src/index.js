import { createElement as el } from 'react';
import { classes } from './index.st.css';

export function Index() {
    return el('div', { className: classes.root }, 'Hello World');
}
