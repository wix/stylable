const os = require('os');

module.exports = {
    colors: true,
    'enable-source-maps': true,
    jobs: Math.min(2, os.cpus().length - 1),
};
