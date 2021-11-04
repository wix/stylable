const os = require('os');

module.exports = {
    colors: true,
    'enable-source-maps': true,
    jobs: Math.min(4, os.cpus().length - 1),
};
