import { classes } from './index.st.css';

const container = document.createElement("div");

const span1 = document.createElement("span");
span1.classList.add(classes.css);
container.appendChild(span1)

const span2 = document.createElement("span");
span2.classList.add(classes.js);
container.appendChild(span2)

document.body.appendChild(container);
