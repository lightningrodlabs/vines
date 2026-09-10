const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const crypto = require('crypto');

/** */
function getFileSHA256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

/** */
function writeVersionJs(happSha256) {
    const content = `
export const APP_VERSION = '${packageJson.version}';
export const HAPP_SHA256 = '${happSha256}';
`;
    // src/generated/ is gitignored, so on a fresh clone the directory does not
    // exist yet; without the mkdir, writeFileSync threw, the .catch below
    // swallowed it, and the build failed later on a missing module.
    const out = './webapp/src/generated/version.js';
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content);
}


getFileSHA256('./artifacts/vines.happ')
    .then(hash => {
        console.log('SHA256:', hash);
        writeVersionJs(hash);
    })
    .catch(err => { console.error('Error:', err); process.exit(1); });

