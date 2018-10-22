const sodium = require('sodium-native')
const fs = require('fs')

const secretKey = Buffer.from(fs.readFileSync('encrypt.key', 'utf8'), 'hex')
const cipher = Buffer.from(process.argv[2], 'hex')
const nonce = Buffer.from(process.argv[3], 'hex')
const message = Buffer.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)

if (sodium.crypto_secretbox_open_easy(message, cipher, nonce, secretKey)) {
    console.log('Decrypted message: ', message.toString())
} else {
    console.error('Unable to decrypt message.')
}
