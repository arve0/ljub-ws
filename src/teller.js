const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')
const sodium = require('sodium-native')

const client = jsonStream(net.connect(3876))

const cmd = process.argv[2] || 'balance'
const value = process.argv[3] || null
const id = process.argv[4] || '1'

client.on('data', function (msg) {
  console.log('Teller received:', msg)
  client.end()
})

let message = { cmd, value, id }

if (cmd === 'register') {
  const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

  sodium.crypto_sign_keypair(publicKey, secretKey)
  fs.writeFileSync('customer-public-' + id, publicKey)
  fs.writeFileSync('customer-secret-' + id, secretKey)

  message.publickey = publicKey.toString('hex')
} else {
  const secretKey = fs.readFileSync('customer-secret-' + id)
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)

  console.log('Signing message:')
  console.dir(message)

  sodium.crypto_sign_detached(signature, Buffer.from(JSON.stringify(message)), secretKey)

  message.signature = signature.toString('hex')
}


client.write(message)
