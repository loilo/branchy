const { fork } = require('child_process')
const { dirname, join } = require('path')

class BranchyError extends Error {
  constructor (message, name, stack) {
    super('Error in forked function:\n')

    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)

    this.message += `${name}: ${message}\n${stack}`.split('\n').map(line => `    ${line}`).join('\n') + '\n'
  }
}

module.exports = function branchy (callback) {
  return (...args) => new Promise((resolve, reject) => {
    const forked = fork(join(__dirname, 'thread'))

    // Get source file from stack
    let err = (new Error()).stack
    err = err.slice(err.indexOf('at args') + 7).trim()
    err = err.slice(err.indexOf('at')).trim()
    err = err.slice(err.indexOf('(') + 1).trim()
    err = err.slice(0, err.indexOf('\n')).trim()
    const sourceFile = err.match(/^(.+):[0-9]+:[0-9]+\)$/)[1]

    // Check for results or errors
    forked.on('message', ({ type, result, name, message, stack }) => {
      if (type === 'error') {
        const err = new BranchyError(message, name, stack)

        reject(err)
      } else {
        resolve(result)
      }
    })

    // Extra check for errors, just to be sure
    forked.on('error', err => {
      reject(err)
    })

    // Send start signal
    forked.send({
      callback: typeof callback === 'string'
        ? `require(${JSON.stringify(callback)})`
        : String(callback),
      args,
      env: {
        __filename: sourceFile,
        __dirname: dirname(sourceFile)
      }
    })
  })
}
