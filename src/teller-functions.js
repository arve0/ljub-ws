const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')
const sodium = require('sodium-native')

exports.commands = {
  register: (id = '1') => ({
    cmd: 'register',
    id,
    publickey: createSignatureKeys(id),
  }),
  balance: (id = '1') => ({
    cmd: 'balance',
    id,
  }),
  deposit: (id = '1', amount = '10') => ({
    cmd: 'deposit',
    id,
    amount,
  }),
  withdraw: (id = '1', amount = '10') => ({
    cmd: 'withdraw',
    id,
    amount,
  })
}


exports.sign = function (message) {
  const secretKey = getSecretKey(message.id)
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  const latestHash = getLastestHash(message.id)

  sodium.crypto_sign_detached(signature, Buffer.from(/*latestHash +*/ JSON.stringify(message)), secretKey)
  message.signature = signature.toString('hex')

  return message
}

exports.send = function (message, port = 3876) {
  return new Promise((resolve, reject) => {
    const client = jsonStream(net.connect(port))

    client.on('data', function (response) {
      client.end()

      if (response.hash && message.id) {
        fs.writeFileSync('customer-latest-hash-' + message.id, response.hash)
      }

      if (response.error) {
        reject(response.error)
      } else {
        resolve(response)
      }
    })

    client.write(message)
  })
}

function getSecretKey(id) {
    try {
        return fs.readFileSync('customer-secret-' + id)
    } catch (_) {
        return Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    }
}

function createSignatureKeys (id) {
  const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

  sodium.crypto_sign_keypair(publicKey, secretKey)

  fs.writeFileSync('customer-public-' + id, publicKey)
  fs.writeFileSync('customer-secret-' + id, secretKey)

  return publicKey.toString('hex')
}

function getLastestHash(id) {
  try {
    return fs.readFileSync('customer-latest-hash-' + id, 'utf8')
  } catch (_) {
    return ''
  }
}