const sodium = require('sodium-native')
const fs = require('fs')

const secretKey = fs.readFileSync('encrypt.key')
const message = Buffer.from(process.argv[2])

const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
sodium.randombytes_buf(nonce)

const cipher = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES)

sodium.crypto_secretbox_easy(cipher, message, nonce, secretKey)

console.log(cipher.toString('hex'), nonce.toString('hex'))
