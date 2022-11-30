module.exports = {
    require: ['ts-node/register', 'source-map-support/register'],
    extension: ['ts'],
    package: '../package.json',
    ui: 'bdd',
    'watch-files': ['./**/*.ts', '../src/**/*.ts'],
    'watch-extensions': 'ts',
    timeout: 30000,
    bail: true,
    exit: true,
};
