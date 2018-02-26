import 'mocha';
import {expect} from 'chai';
import stylableProxy from './utils/stylable-proxy';

describe('stylable-proxy', () => {
  before(() => {
    require.extensions['.css'] = function mockCss(module) {
      module.exports = stylableProxy;
    };
  });

  it('should apply the proxy function and preserve stylable', () => {
    const css = require('./test-fixtures/simple.st.css');
    expect(css.a).to.equal('a');
    expect(css('root', {state: true}, {prop: 1})).to.eql({
      className: 'root',
      "data-namespace-state": true
    });
  });

  after(() => {
    delete require.extensions['.css'];
    delete require.cache[__dirname + '/test-fixtures/simple.st.css'];
  });
});
