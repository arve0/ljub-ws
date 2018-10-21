const sodium = require('sodium-native')

/*

`sodium-native` exposes digital signatures under the `crypto_sign_*` namespace.
The most important ones are:

* `sodium.crypto_sign_keypair(publicKey, secretKey)`
  Generates a key pair, where `publicKey` and `secretKey` are the output
  `Buffer`s. They need to be exactly `sodium.crypto_sign_PUBLICKEYBYTES` and
  `sodium.crypto_sign_SECRETKEYBYTES` long.
* `sodium.crypto_sign_detached(signature, message, secretKey)`
  The detached API writes the digital signature to `signature` `Buffer`, for
  `message` using `secretKey`. The signature `Buffer` needs to be
  `crypto_sign_BYTES` long. Like with hashing, this signature may contain
  non-printable bytes, so it is a good idea to convert to `hex` or `base64` if
  you want to work with it outside `Buffer`s.
* `var bool = sodium.crypto_sign_verify_detached(signature, message, publicKey)`
  To verify a signature, you pass in `signature` `Buffer`, the original
  `message` `Buffer` and the corresponding `publicKey`. It will return `bool`
  whether the signature could be verified or not.
 */

const publicKey = Buffer.from(process.argv[2], 'hex')
const message = process.argv[3]
const signature = Buffer.from(process.argv[4], 'hex')

const ok = sodium.crypto_sign_verify_detached(signature, Buffer.from(message), publicKey)

console.log('"' + message + '"', ok ? 'verified ok.' : 'NOT verified!')
