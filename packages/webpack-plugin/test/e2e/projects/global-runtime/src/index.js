import { classes } from './index.st.css';

const div = document.createElement('div');
div.dataset.name = 'index';
div.classList.add(classes.root);

document.body.appendChild(div);
