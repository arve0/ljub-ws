const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')
const sodium = require('sodium-native')

const [publicKey, secretKey] = getPublicAndSecretKey()
const encryptKey = getEncryptKey()
const transactions = readTransactions()
const customers = getCustomers()

const server = net.createServer(function (socket) {
    socket = jsonStream(socket)

    socket.on('data', function (msg) {
        console.log('Bank received:', msg)

        let response
        try {
            if (msg.cmd !== 'register' && !customerExists(msg.id)) {
                throw new Error(`Unknown customer "${id}".`)
            } else if (invalidSignature(msg)) {
                throw new Error('Invalid signature.')
            }

            switch (msg.cmd) {
                case 'balance':
                    response = balance(msg.id)
                    break
                case 'deposit':
                case 'withdraw':
                    response = logTransaction(msg.cmd, msg.value, msg.id)
                    break
                case 'register':
                    response = register(msg.value, msg.publickey)
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

function balance (id) {
    return {
        cmd: 'balance',
        balance: transactions
            .map(t => t.value)
            .filter(t => t.id === id)
            .reduce((sum, transaction) => {
                return transaction.cmd === 'deposit'
                    ? sum + transaction.amount
                    : sum - transaction.amount
            }, 0)
    }
}

function logTransaction (cmd, value, id) {
    let amount = parseFloat(value)

    if (isNaN(amount)) {
        throw new Error(`Unable to parse "${value}" as number`)
    }

    if (cmd === 'withdraw') {
        hasSufficientFunds(amount, id)
    }

    addTransaction({ cmd, amount, id })
    writeTransactions()

    return balance(id)
}

function hasSufficientFunds (amount, id) {
    let currentBalance = balance(id).balance

    if (amount > currentBalance) {
        throw new Error(`Unable to withdraw ${amount} when current funds are ${currentBalance}.`)
    }
}

function readTransactions () {
    try {
        let decrypted = decrypt(fs.readFileSync('transactions'))
        let transactions = JSON.parse(decrypted)

        if (!Array.isArray(transactions)) {
            throw new Error('transactions is not an array')
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
    fs.writeFileSync('transactions', encrypt(JSON.stringify(transactions)))
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

function getEncryptKey () {
    const filename = 'encrypt.key'

    if (fs.existsSync(filename)) {
        return fs.readFileSync(filename)
    }

    const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
    sodium.randombytes_buf(key)

    fs.writeFileSync('encrypt.key', key)

    return key
}

function encrypt (data) {
    const message = Buffer.from(data)

    const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
    sodium.randombytes_buf(nonce)

    const cipher = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES)

    sodium.crypto_secretbox_easy(cipher, message, nonce, encryptKey)

    fs.writeFileSync('current-nonce', nonce)

    return cipher
}

function decrypt (cipher) {
    const nonce = fs.readFileSync('current-nonce')
    const message = Buffer.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)

    if (sodium.crypto_secretbox_open_easy(message, cipher, nonce, encryptKey)) {
        return message.toString()
    } else {
        throw new Error('Unable to decrypt transaction log.')
    }
}

function getCustomers () {
    try {
        return JSON.parse(fs.readFileSync('customers.json'))
    } catch (err) {
        console.error(err)
        return []
    }
}

function register (id, publicKey) {
    if (typeof id !== 'string') {
        throw new Error(`Id missing. Send id as a string.`)
    } else if  (typeof publicKey !== 'string') {
        throw new Error(`Public key missing. Send public key as a string.`)
    }

    if (customerExists(id)) {
        throw new Error(`Customer already exists.`)
    }

    customers.push({ id, publicKey })

    fs.writeFileSync('customers.json', JSON.stringify(customers))

    return { cmd: 'register', id }
}

function customerExists (id) {
    return customers.some(c => c.id === id)
}

function invalidSignature (msg) {
    if (msg.cmd === 'register') {
        return false
    }

    const storedPublicKey = Buffer.from(customers.find(c => c.id === msg.id).publicKey, 'hex')
    const signature = Buffer.from(msg.signature, 'hex')
    delete msg['signature']
    const message = Buffer.from(JSON.stringify(msg))

    console.log('Validating message:')
    console.dir(msg)

    return !sodium.crypto_sign_verify_detached(signature, message, storedPublicKey)
}