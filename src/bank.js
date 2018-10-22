const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')
const sodium = require('sodium-native')

const [publicKey, secretKey] = getPublicAndSecretKey()
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
        balance: transactions
            .map(t => t.value)
            .reduce((sum, transaction) => {
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

    addTransaction({ cmd, amount })
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
        let transactions = JSON.parse(fs.readFileSync('transactions.json'))

        if (!Array.isArray(transactions)) {
            throw new Error('transactions.json is not an array')
        }

        // if invalid, we throw, and return empty array
        validateTransactions(transactions);

        return transactions
    } catch (err) {
        console.log(err)
        return []
    }
}

function validateTransactions(transactions) {
    let prevHash = genesisHash();

    for (let transaction of transactions) {
        if (transactionIsInvalid(prevHash, transaction)) {
            throw new Error(`Transaction "${JSON.stringify(transaction)}" is invalid. Previous hash was ${JSON.stringify(prevHash)}.`);
        } else if (signatureIsInvalid(transaction)) {
            throw new Error(`Failed to verify signature for transaction "${JSON.stringify(transaction)}".`);
        }
        prevHash = transaction.hash;
    }
}

function writeTransactions () {
    fs.writeFileSync('transactions.json', JSON.stringify(transactions, null, 2))
}

function addTransaction (transaction) {
    const prevTransaction = last(transactions) || {}
    const prevHash = prevTransaction.hash || genesisHash()

    const value = transaction
    const hash = createHash(prevHash + JSON.stringify(transaction))

    const signatureBuffer = Buffer.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(signatureBuffer, Buffer.from(hash), secretKey)
    const signature = signatureBuffer.toString('hex')

    transactions.push({ value, hash, signature })
}

function last (arr) {
    return arr[arr.length - 1]
}

function genesisHash () {
    return Buffer.alloc(32).toString('hex')
}

function createHash (str) {
    const output = Buffer.alloc(sodium.crypto_generichash_BYTES)
    const input = Buffer.from(str)

    sodium.crypto_generichash(output, input)
    return output.toString('hex')
}

function transactionIsInvalid (prevHash, transaction) {
    return createHash(prevHash + JSON.stringify(transaction.value)) !== transaction.hash
}

function getPublicAndSecretKey () {
    const publicKeyFilename = 'signkey.pub'
    const secretKeyFilename = 'signkey'

    if (fs.existsSync(publicKeyFilename) && fs.existsSync(secretKeyFilename)) {
        return [
            fs.readFileSync(publicKeyFilename, 'utf8'),
            fs.readFileSync(secretKeyFilename, 'utf8')
        ].map(key => Buffer.from(key, 'hex'))
    }

    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

    sodium.crypto_sign_keypair(publicKey, secretKey)

    fs.writeFileSync(publicKeyFilename, publicKey.toString('hex'))
    fs.writeFileSync(secretKeyFilename, secretKey.toString('hex'))

    return [publicKey, secretKey]
}

function signatureIsInvalid (transaction) {
    return !sodium.crypto_sign_verify_detached(Buffer.from(transaction.signature, 'hex'), Buffer.from(transaction.hash), publicKey)
}