const fs = require('fs')
const assert = require('assert')
const { commands, sign, send } = require('./teller-functions.js')
const { startServer, stopServer } = require('./bank-functions.js')

describe('registering', () => {
  it('should not allow balance when not registered', (done) => {
    let msg = commands.balance()
    send(sign(msg)).catch(_ => done())
  })

  it('should allow balance when registered', async () => {
    await register()

    msg = commands.balance()
    await send(sign(msg))
  })
})

describe('deposit', () => {
  it('should not allow deposit without registering', (done) => {
    let msg = commands.deposit()
    send(sign(msg)).catch(_ => done())
  })

  it('should deposit the right amount', async () => {
    await register()

    let id = '1'
    let amount = '100'
    let msg = commands.deposit(id, amount)
    let response = await send(sign(msg))
    assert.equal(response.balance, amount)
  })

  it('should be able to deposit into two accounts', async () => {
    await register('1')
    await register('2')
    let responseA = await deposit({ id: '1', amount: 10 })
    let responseB = await deposit({ id: '2', amount: 100 })

    assert.equal(responseA.balance, 10)
    assert.equal(responseB.balance, 100)
  })

  it('should be able to deposit several times', async () => {
    await register('1')
    let responseA = await deposit({ id: '1', amount: 10 })
    let responseB = await deposit({ id: '1', amount: 100 })

    assert.equal(responseA.balance, 10)
    assert.equal(responseB.balance, 110)
  })
})

describe('withdraw', () => {
  it('should not be able to withdraw more then available', async () => {
    await register()
    let didFail = false
    let response
    try {
      response = await withdraw({ id: '1', amount: 100 })
    } catch (_) {
      didFail = true
    }
    assert(didFail, `Got response: ${JSON.stringify(response)}`)
  })
})

beforeEach(async () => {
  let filenames = ['customers.json', 'transactions']
  filenames.forEach(filename => {
    try { fs.unlinkSync(filename) }
    catch (_) { }
  })

  await stopServer().catch(_ => {})
  await startServer()
})

after(() => {
  stopServer()
})

function register (id) {
  let msg = commands.register(id)
  return send(sign(msg))
}

function deposit ({ id, amount }) {
  let msg = commands.deposit(id, amount)
  return send(sign(msg))
}

function withdraw ({ id, amount }) {
  let msg = commands.withdraw(id, amount)
  return send(sign(msg))
}