import { classes, $id } from './index2.st.css';

const div = document.createElement('div');
div.dataset.name = 'index2'
div.classList.add(classes.root);

div.textContent = JSON.stringify(
    window.__stylable__.$.getStyles([$id]).map(x => x.__proto__),
    null,
    4
);

document.body.appendChild(div);
