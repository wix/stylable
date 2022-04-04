import { Button } from 'wix-ui-tpa';
import { classes } from './index.st.css';

document.body.classList.add(classes.root);
document.body.innerHTML = `<span>This is text</span>` + Button();
