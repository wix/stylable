// import { expect } from 'chai';
// import * as postcss from 'postcss';
// import { generateStylableRoot } from '../utils/generate-test-util';

// describe('extend mixin function', () => {

//     it('initial syntax parsing (wip)', () => {

//         const result = generateStylableRoot({
//             entry: `/entry.st.css`,
//             files: {
//                 '/entry.st.css': {
//                     namespace: 'entry',
//                     content: `
//                         :import {
//                             -st-from: "./button.st.css";
//                             -st-named: Button;
//                         }

//                         .root {
//                             -st-extends: Button(text-color red, bg-color green);
//                         }
//                     `
//                 },
//                 '/button.st.css': {
//                     namespace: 'entry',
//                     content: `
//                         :vars {
//                             text-color: white;
//                             bg-color: black;
//                         }
//                         .root {
//                             color: value(text-color);
//                             background-color: value(bg-color);
//                         }
//                     `
//                 }
//             }
//         });

//         const rule = result.nodes![0] as postcss.Rule;

//         expect(rule.selector).to.equal('.entry--root');
//         expect((rule.nodes![1] as postcss.Declaration).value).to.equal('red');
//         expect((rule.nodes![2] as postcss.Declaration).value).to.equal('green');

//     });

// });


// // Button
// // Button Button
// // Button()
// // Button() Button()

// // Button(text-color red, bg-color green)

// // Button(text-color red, bg-color value(some-color))

// // Button(value(text-color), red)



// // Button(text-color "red i value(blue)")


// // Button(red, text-color red) // error

