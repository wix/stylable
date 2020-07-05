import { classes, st } from './index.st.css';

document.body.innerHTML = `
    <div class="exports-classes">${JSON.stringify(classes)}</div>
    <div class="exports-style-function">${typeof st}</div>
`;
