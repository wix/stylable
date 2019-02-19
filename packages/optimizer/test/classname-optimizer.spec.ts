import { expect } from 'chai';
import { parse } from 'postcss';
import { StylableClassNameOptimizer } from '../src';

describe('StylableClassNameOptimizer  Unit', () => {
    it('should give unique names to classes and rewrite exports', () => {
        const optimizer = new StylableClassNameOptimizer();
        const ast = parse(`.namespace--classname{} .namespace--thing{} .namespace--composed{}`);
        const exports = {
            classname: 'namespace--classname',
            thing: 'namespace--thing',
            composed: 'namespace--composed namespace--classname'
        };

        optimizer.optimizeAstAndExports(ast, exports, undefined, 'namespace');
        expect(exports, 'exports rewrite').to.eql({
            classname: 's0',
            thing: 's1',
            composed: 's2 s0'
        });
        expect(ast.toString(), 'ast optimized').to.equal('.s0{} .s1{} .s2{}');
    });

    it('should not optimize state classes', () => {
        // tslint:disable: max-line-length
        const optimizer = new StylableClassNameOptimizer();
        const ast = parse(`.namespace--classname{} .namespace__state{} .namespace___otherState5_value{} .namespace--thing{}`);
        const exports = {
            classname: 'namespace--classname',
            thing: 'namespace--thing'
        };

        optimizer.optimizeAstAndExports(ast, exports, undefined, 'namespace');
        expect(exports, 'exports rewrite').to.eql({
            classname: 's0',
            thing: 's1'
        });
        expect(ast.toString(), 'ast optimized').to.equal('.s0{} .namespace__state{} .namespace___otherState5_value{} .s1{}');
        // tslint:enable: max-line-length
    });
});
