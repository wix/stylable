import { classes, namespace } from './index.st.css';

document.documentElement.classList.add(classes.root);
const style = document.head.querySelector(`[st-id="${namespace}"]`);

window.gotStyleByNamespace = Boolean(style);
