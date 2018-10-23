const { commands, sign, send } = require('./teller-functions.js')

async function main () {
  try {
    const cmd = process.argv[2] || 'balance'
    const message = commands[cmd](...process.argv.slice(3))

    process.stdout.write('Sending: ')
    console.dir(message)

    let response = await send(sign(message))
    console.log('Got response:', response)
  } catch (err) {
    console.error('Reponse ERROR:', err)
    process.exit(1)
  }
}

main()