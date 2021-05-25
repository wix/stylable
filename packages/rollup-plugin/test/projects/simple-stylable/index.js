import { st, cssStates, classes } from './index.st.css';

document.body.classList.add(classes.root);
document.body.innerHTML = `Hello<div class="${st(
    classes.part,
    cssStates({ myState: true })
)}">Stylable</div>`;
