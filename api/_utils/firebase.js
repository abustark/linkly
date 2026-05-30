const admin = require('firebase-admin');

function extractFirstJsonObject(value) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let start = -1;

    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\' && inString) {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{') {
            if (depth === 0) {
                start = index;
            }
            depth += 1;
        }

        if (char === '}') {
            depth -= 1;

            if (depth === 0 && start !== -1) {
                return value.slice(start, index + 1);
            }
        }
    }

    return value;
}

function parseServiceAccount(rawServiceAccount) {
    const trimmed = rawServiceAccount.trim();
    const serviceAccountJson = trimmed.startsWith('{')
        ? trimmed
        : Buffer.from(trimmed, 'base64').toString('utf8').trim();

    try {
        return JSON.parse(serviceAccountJson);
    } catch (error) {
        const repairedJson = serviceAccountJson.replace(
            /("private_key"\s*:\s*")([\s\S]*?)("\s*,\s*"client_email")/,
            (_match, prefix, privateKey, suffix) => {
                const escapedPrivateKey = privateKey
                    .replace(/\r?\n/g, '\\n')
                    .replace(/\\/g, '\\\\')
                    .replace(/\\\\n/g, '\\n');

                return `${prefix}${escapedPrivateKey}${suffix}`;
            }
        );

        try {
            return JSON.parse(repairedJson);
        } catch (repairError) {
            return JSON.parse(extractFirstJsonObject(repairedJson));
        }
    }
}

function getServiceAccount() {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!rawServiceAccount) {
        return require('../serviceAccountKey.json');
    }

    const serviceAccount = parseServiceAccount(rawServiceAccount);

    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return serviceAccount;
}

try {
    const serviceAccount = getServiceAccount();

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (error) {
    console.error('Firebase initialization error:', error.message);
}

module.exports = admin;
