import { expect } from 'chai';
import { parse } from 'postcss';
import { StylableOptimizer } from '../src';

describe('StylableOptimizer className optimizations', () => {
    it('should give unique names to classes and rewrite exports', () => {
        const optimizer = new StylableOptimizer();
        const ast = parse(`.namespace__classname{} .namespace__thing{} .namespace__composed{}`);
        const exports = {
            classname: 'namespace__classname',
            thing: 'namespace__thing',
            composed: 'namespace__composed namespace__classname',
        };

        optimizer.optimizeAstAndExports(
            ast,
            exports,
            undefined,
            { namespace: true },
            {},
            '__',
            false,
            true
        );
        expect(exports, 'exports rewrite').to.eql({
            classname: 's0',
            thing: 's1',
            composed: 's2 s0',
        });
        expect(ast.toString(), 'ast optimized').to.equal('.s0{} .s1{} .s2{}');
    });

    it('should not optimize state classes', () => {
        const optimizer = new StylableOptimizer();
        const ast = parse(
            `.namespace__classname{} .namespace--state{} .namespace---otherState-5-value{} .namespace__thing{} .otherNamespace__imported{} .otherNamespace--state{}`
        );
        const exports = {
            classname: 'namespace__classname',
            thing: 'namespace__thing',
            imported: 'otherNamespace__imported',
        };

        optimizer.optimizeAstAndExports(
            ast,
            exports,
            undefined,
            {
                namespace: true,
                otherNamespace: true,
            },
            {},
            '__',
            false,
            true
        );
        expect(exports, 'exports rewrite').to.eql({
            classname: 's0',
            thing: 's1',
            imported: 's2',
        });
        expect(ast.toString(), 'ast optimized').to.equal(
            '.s0{} .namespace--state{} .namespace---otherState-5-value{} .s1{} .s2{} .otherNamespace--state{}'
        );
    });
});

describe('StylableOptimizer shortNamespaces', () => {
    it('should shorten namespaces of all locals', () => {
        const optimizer = new StylableOptimizer();
        const ast = parse(
            `
        .namespace__classname{} 
        .namespace__thing{} 
        .namespace__composed{}
        .namespace--state{} 
        .namespace---otherState-5-value{} 
        .otherNamespace__imported{}
        .otherNamespace--state{}
        `.trim()
        );
        const exports = {
            classname: 'namespace__classname',
            thing: 'namespace__thing',
            composed: 'namespace__composed namespace__classname',
        };

        optimizer.optimizeAstAndExports(
            ast,
            exports,
            undefined,
            { namespace: true, otherNamespace: true },
            {},
            '__',
            true,
            false
        );
        expect(exports, 'exports rewrite').to.eql({
            classname: 'o0__classname',
            thing: 'o0__thing',
            composed: 'o0__composed o0__classname',
        });
        expect(ast.toString().replace(/[\n\r\s]+/gm, ' '), 'ast optimized').to.equal(
            `.o0__classname{} .o0__thing{} .o0__composed{} .o0--state{} .o0---otherState-5-value{} .o1__imported{} .o1--state{}`
        );
    });
});
