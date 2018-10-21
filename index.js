var sodium = require('sodium-native')

var nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
var key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES) // secure buffer
var message = Buffer.from('Hello, World!')
var ciphertext = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES)

sodium.randombytes_buf(nonce) // insert random data into nonce
sodium.randombytes_buf(key)  // insert random data into key

// encrypted message is stored in ciphertext.
sodium.crypto_secretbox_easy(ciphertext, message, nonce, key)

console.log('Encrypted message:', ciphertext)

var plainText = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES)

if (!sodium.crypto_secretbox_open_easy(plainText, ciphertext, nonce, key)) {
  console.log('Decryption failed!')
} else {
  console.log('Decrypted message:', plainText, '(' + plainText.toString() + ')')
}



var jsonStream = require('duplex-json-stream')
var net = require('net')

var server = net.createServer(function (socket) {
  socket = jsonStream(socket) // turn the transport stream into an object stream
  socket.on('data', function (data) {
    socket.write({echo: data}) // echo back the messages
  })
})

server.listen(10000)

var client = jsonStream(net.connect(10000))

client.write({hello: 'world'})
client.on('data', function (data) {
  console.log(data) // will print {echo: {hello: 'world'}}
})