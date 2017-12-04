"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var runtime_1 = require("../src/runtime");
describe('runtime', function () {
    it('should expose locals on top level style', function () {
        var runtime = runtime_1.create('root', 'namespace', { local: 'namespace--local' }, null, '0');
        chai_1.expect(runtime.local).to.equal('namespace--local');
        chai_1.expect(runtime.$get('local'), 'private internal usage').to.equal('namespace--local');
    });
    it('should expose cssStates helper', function () {
        var runtime = runtime_1.create('root', 'namespace', { local: 'namespace--local' }, null, '0');
        chai_1.expect(runtime.$cssStates({ state: true, otherstate: false })).to.eql((_a = {},
            _a["data-" + runtime.$stylesheet.namespace + "-" + 'state'] = true,
            _a));
        chai_1.expect(runtime.$cssStates({ state: false, otherstate: false })).to.eql({});
        var _a;
    });
    describe('Generate Element Attributes', function () {
        it('should expose function api to apply stylable on components', function () {
            var runtime = runtime_1.create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            chai_1.expect(typeof runtime, 'typeof runtime').to.equal('function');
        });
        it('should return empty object when called with empty string', function () {
            var runtime = runtime_1.create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            chai_1.expect(runtime('')).to.eql({});
        });
        it('should map classNames to locals with fallback to global classes', function () {
            var locals = { root: 'namespace--root', local: 'namespace--local' };
            var runtime = runtime_1.create('root', 'namespace', locals, null, '0');
            chai_1.expect(runtime('root local global')).to.eql({
                className: 'namespace--root namespace--local global'
            });
        });
        it('should add states mapping', function () {
            var runtime = runtime_1.create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            chai_1.expect(runtime('', { on: true, off: false })).to.eql((_a = {},
                _a["data-" + runtime.$stylesheet.namespace + "-" + 'on'] = true,
                _a));
            var _a;
        });
        it('should append className from props', function () {
            var runtime = runtime_1.create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            var props = { className: 'class-from-props' };
            chai_1.expect(runtime('root', {}, props)).to.eql({
                className: 'namespace--root class-from-props'
            });
        });
        it('should copy data- props ', function () {
            var runtime = runtime_1.create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            chai_1.expect(runtime('root', {}, { 'data-prop': true })).to.eql({
                'className': 'namespace--root',
                'data-prop': true
            });
        });
        it('should override states with data- props ', function () {
            var runtime = runtime_1.create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            var nsStateName = "data-" + runtime.$stylesheet.namespace + "-" + 'on';
            chai_1.expect(runtime('root', { a: false }, (_a = {}, _a[nsStateName] = true, _a))).to.eql((_b = {
                    className: 'namespace--root'
                },
                _b[nsStateName] = true,
                _b));
            var _a, _b;
        });
    });
});
//# sourceMappingURL=runtime.spec.js.map