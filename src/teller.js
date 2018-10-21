const jsonStream = require('duplex-json-stream')
const net = require('net')

const client = jsonStream(net.connect(3876))

const cmd = process.argv[2] || 'balance'
const value = process.argv[3] || null

client.on('data', function (msg) {
  console.log('Teller received:', msg)
  client.end()
})

client.write({
    cmd,
    value,
})
