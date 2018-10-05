import { render as Button } from 'test-components/button';
import { render as Gallery } from 'test-components/gallery';

import style from './index.st.css';
if (typeof document !== 'undefined') {
    document.documentElement.classList.add(style.root);
    document.body.appendChild(Gallery());
    document.body.appendChild(Button());
}
