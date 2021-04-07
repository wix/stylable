/* COMMENT_LINE */ import { button } from 'test-components';
/* UNCOMMENT_LINE import { button, box } from 'test-components'; */
const btn = button.render('I am a button!!!!!');
btn.id = 'btn';
document.body.appendChild(btn);
/* UNCOMMENT_LINE document.body.appendChild(box.render()); */

