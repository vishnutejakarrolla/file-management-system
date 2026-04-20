const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const algorithm = 'aes-256-ctr';
const rawKey = process.env.ENCRYPTION_KEY || 'my-secret-key-file-manager-123';
const secretKey = crypto.createHash('sha256').update(String(rawKey)).digest('base64').substr(0, 32);

const encryptStream = (readStream, writeStream) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    
    // Write IV to the beginning of the file so we can use it for decryption
    writeStream.write(iv);
    
    readStream.pipe(cipher).pipe(writeStream);
    
    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        readStream.on('error', reject);
    });
};

const decryptStream = (readStream, writeStream) => {
    return new Promise((resolve, reject) => {
        readStream.once('readable', () => {
            const iv = readStream.read(16);
            if (!iv) {
                return reject(new Error('Could not read IV from file'));
            }
            const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
            readStream.pipe(decipher).pipe(writeStream);
        });

        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        readStream.on('error', reject);
    });
};

module.exports = {
    encryptStream,
    decryptStream
};
