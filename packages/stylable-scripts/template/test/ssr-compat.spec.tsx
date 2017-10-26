import * as React from 'react';
import {renderToString} from 'react-dom/server';
import {expect} from 'test-drive-react';
import {App} from '../src/components/app';

describe('App SSR compatibility', () => {
    it(`renders on Node.js using React's server side rendering`, () => {
        expect(() => renderToString(<App />)).to.not.throw();
    });
});
