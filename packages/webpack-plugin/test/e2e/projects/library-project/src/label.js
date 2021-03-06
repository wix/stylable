import { classes } from './button.st.css';
const render = (label = 'I am a Label') => {
    const text = document.createElement('span');
    text.textContent = label;
    text.classList.add(classes.root);
    return text;
};
export { classes, render };
