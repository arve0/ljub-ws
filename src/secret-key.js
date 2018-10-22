const sodium = require('sodium-native')
const fs = require('fs')

const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
sodium.randombytes_buf(key)

fs.writeFileSync('encrypt.key', key)
