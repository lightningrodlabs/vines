const fs = require('fs');
const packageJson = require('../package.json');

const content = `export const APP_VERSION = '${packageJson.version}';`;
fs.writeFileSync('./webapp/src/generated/version.js', content);
