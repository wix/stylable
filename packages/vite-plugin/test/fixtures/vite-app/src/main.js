import { style, classes } from './stuff.st.css';

const root = document.getElementById('root');
root.className = classes.root;
root.textContent = 'This <div /> should be blue';
root.setAttribute('data-hook', 'target');
