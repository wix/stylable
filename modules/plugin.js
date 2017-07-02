'use strict';
var camelCaseCSS = require("camelcase-css");
var stack;

function Declaration(name, value) {
    this.type = 'decl';
    this.name = name;
    this.value = value;
}

function Rule(rule) {
    this.type = 'rule';
    this.rule = rule;
    this.decl = [];
}

function AtRule(rule) {
    this.type = '@at-type';
    this.rule = rule;
    this.children = [];
}


function objectify(nodes, out) {
    return nodes.length ? nodes.reduce((out, node) => {
        return setOrPush(out, node.rule, node.type === '@at-type' ?
            objectify(node.children) :
            objectifyDeclarations(node.decl));
    }, out || {}) : true;
}

function objectifyDeclarations(decl, out) {
    return decl.reduce((out, node) => {
        return setOrPush(out, camelCaseCSS(node.name), node.value);
    }, out || {});
}

function setOrPush(target, key, value) {
    if (Array.isArray(target[key])) {
        target[key].push(value);
    } else if (target[key]) {
        target[key] = [target[key], value];
    } else {
        target[key] = value;
    }
    return target;
}

//handlers

function handleDecl(rule, content, id) {
    var node;
    if (content.charCodeAt(0) !== 64) {
        var index = content.indexOf(':');
        var name = content.substring(0, index);
        var value = content.substring(index + 1).trim();
        node = new Declaration(name, value);
    } else {
        rule = null;
        node = new AtRule(content);
    }
    stack.push({ id, rule, node });
}

function handleRule(rule, id) {
    var node = new Rule(rule);
    var size = stack.length;
    if (!rule && id === 0) { return; }
    while (size--) {
        if (stack[size].rule !== rule) { continue; }
        if (stack[size].node.type === 'rule') {
            node.decl = node.decl.concat(stack.splice(size, 1)[0].node.decl);
        } else {
            node.decl.push(stack.splice(size, 1)[0].node);
        }
    }
    node.decl.reverse();
    stack.push({ id, rule, node });
}

function handleAtRule(rule, id) {
    var node = new AtRule(rule);
    var size = stack.length;
    while (size--) {
        if (stack[size].id === id) {
            node.children.push(stack.splice(size, 1)[0].node);
        }
    }
    if (rule === '@font-face') {
        node.children.forEach((node) => {
            node.rule = rule;
            stack.push({ id: 0, rule, node });
        });
    } else {
        node.children.reverse();
        stack.push({ id: 0, rule, node });
    }

}

module.exports = function (context, content, selectors, parents, line, column, length, id) {

    var rule = selectors.join(', ');

    switch (context) {
        case -1:
            stack = [];
            break
        case -2:
            return objectify(stack.map(_ => _.node));
        case 1:
            handleDecl(rule, content, id);
            break
        case 2:
            handleRule(rule, id);
            break
        case 3:
            handleAtRule(rule, id);
            break
    }
}
