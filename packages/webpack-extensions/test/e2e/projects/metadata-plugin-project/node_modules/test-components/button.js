import { classes } from './button.st.css';
const render = (_text = 'Button') => {
    const btn = document.createElement('button');
    const text = document.createElement('span');
    text.textContent = _text;
    btn.appendChild(text);
    btn.classList.add(classes.root);
    text.classList.add(classes.text);
    return btn;
};
export { classes, render };
