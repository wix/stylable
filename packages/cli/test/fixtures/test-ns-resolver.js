let n = 0;

module.exports.resolveNamespace = function () {
    return 'test-ns-' + n++;
};
