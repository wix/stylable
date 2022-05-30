import { Button } from 'comp-lib';
import { classes } from './index.st.css';

async function run() {
    const s = await import('comp-lib/index.st.css');
    const div = document.body.appendChild(document.createElement('div'));
    div.id = 'kind';
    div.textContent = s.stVars.kind;
}

void run();

document.body.classList.add(classes.root);
document.body.innerHTML = `<span>This is text</span>` + Button();
