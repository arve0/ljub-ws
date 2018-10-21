const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')

const transactions = readTransactions()

const server = net.createServer(function (socket) {
    socket = jsonStream(socket)

    socket.on('data', function (msg) {
        console.log('Bank received:', msg)

        let response
        try {
            switch (msg.cmd) {
                case 'balance':
                    response = balance()
                    break
                case 'deposit':
                case 'withdraw':
                    response = logTransaction(msg.cmd, msg.value)
                    break
                default:
                    throw new Error(`Unknown command "${msg.cmd}"`)
            }
        } catch (err) {
            response = { error: err.message }
        }

        console.log('Bank response:', response)

        socket.end(response)
    })

    socket.on('error', function (error) {
        console.error('Bank server error', error)
        socket.end({ error: error.msg })
    })
})

server.listen(3876)

function balance () {
    return {
        cmd: 'balance',
        balance: transactions.reduce((sum, transaction) => {
            return transaction.cmd === 'deposit'
                ? sum + transaction.amount
                : sum - transaction.amount
        }, 0)
    }
}

function logTransaction (cmd, value) {
    let amount = parseFloat(value)

    if (isNaN(amount)) {
        throw new Error(`Unable to parse "${value}" as number`)
    }

    if (cmd === 'withdraw') {
        hasSufficientFunds(amount)
    }

    transactions.push({ cmd, amount })

    writeTransactions()

    return balance()
}

function hasSufficientFunds (amount) {
    let currentBalance = balance().balance

    if (amount > currentBalance) {
        throw new Error(`Unable to withdraw ${amount} when current funds are ${currentBalance}.`)
    }
}

function readTransactions () {
    try {
        return JSON.parse(fs.readFileSync('transactions.json'))
    } catch (_) {
        return []
    }
}

function writeTransactions () {
    fs.writeFileSync('transactions.json', JSON.stringify(transactions, null, 2))
}

function createHash (str) {

}