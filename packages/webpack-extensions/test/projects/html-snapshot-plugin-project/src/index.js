import { createElement as el } from 'react';
import style from './index.st.css';

export function Index() {
    return el('div', { className: style.root }, 'Hello World');
}
