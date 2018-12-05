import { render } from 'test-components/badge';
import(/* webpackChunkName: "dynamicSplit" */ 'test-components/text');

document.body.appendChild(render());
