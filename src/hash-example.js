const sodium = require('sodium-native')

const outputBufferSize = sodium.crypto_generichash_BYTES
const output = Buffer.alloc(outputBufferSize)

const input = Buffer.from('Hello, World!')

sodium.crypto_generichash(output, input)

console.log(output.toString('hex'))
console.log(output.toString('base64'))