const jsonStream = require('duplex-json-stream')
const net = require('net')

const log = (client) => {
    client.on('data', msg => {
        console.log('Teller received:', msg)
        client.end()
    })
}

const clientA = jsonStream(net.connect(3876))
const clientB = jsonStream(net.connect(3876))

log(clientA)
log(clientB)

clientA.write({
    cmd: 'withdraw',
    value: process.argv[2],
})

clientB.write({
    cmd: 'withdraw',
    value: process.argv[2],
})
