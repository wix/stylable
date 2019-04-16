import { render as Button } from 'test-components/button';
import { render as Gallery } from 'test-components/gallery';

import { classes } from './index.st.css';
if (typeof document !== 'undefined') {
    document.documentElement.classList.add(classes.root);
    document.body.appendChild(Gallery());
    document.body.appendChild(Button());
}
