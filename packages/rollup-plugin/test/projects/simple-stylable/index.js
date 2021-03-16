import { classes } from './index.st.css';

document.body.classList.add(classes.root);
document.body.innerHTML = `Hello<div class="${classes.part}">Stylable</div>`;
