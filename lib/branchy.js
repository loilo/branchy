const { fork } = require('child_process')
const { dirname, join } = require('path')

class BranchyError extends Error {
  constructor(message, name, stack) {
    super('Error in forked function:\n')

    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)

    this.message +=
      `${name}: ${message}\n${stack}`
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n') + '\n'
  }
}

function branchy(callback, { concurrent = Infinity } = {}) {
  // Get call file from stack
  let callStack = new Error().stack
  callStack = callStack.slice(
    callStack.indexOf('\n', callStack.indexOf('\n') + 1) + 1
  )
  callStack = callStack
    .slice(callStack.indexOf('(') + 1, callStack.indexOf('\n'))
    .trim()
  const callFile = callStack.match(/^(.+):[0-9]+:[0-9]+\)$/)[1]

  let filename
  if (typeof callback === 'string') {
    filename = require('module')._resolveFilename(callback, {
      id: callFile,
      filename: callFile,
      paths: require('module')._nodeModulePaths(dirname(callFile))
    })
  } else {
    filename = callFile
  }

  const threadedFn = (args, filename) =>
    new Promise((resolve, reject) => {
      const forked = fork(join(__dirname, 'thread'))

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
        callback:
          typeof callback === 'string'
            ? `require(${JSON.stringify(filename)})`
            : String(callback),
        args,
        env: {
          __filename: filename,
          __dirname: dirname(filename)
        }
      })
    })

  // Control concurrency with a FIFO queue
  if (concurrent !== Infinity) {
    const ConcurrencyContext = require('./context')

    let context

    if (concurrent instanceof ConcurrencyContext) {
      context = concurrent
    } else {
      const concurrencyOptions = {}

      // Determine concurrency by available cores
      if (concurrent === 'auto') {
        concurrencyOptions.concurrent = require('os').cpus().length
      } else if (typeof concurrent === 'object') {
        if (!('threads' in concurrent) || concurrent.threads === 'auto') {
          concurrencyOptions.concurrent = require('os').cpus().length
        } else {
          concurrencyOptions.concurrent = concurrent.threads
        }

        if (typeof concurrent.priority === 'function') {
          concurrencyOptions.priority = ({ args }, cb) =>
            Promise.resolve(concurrent.priority(...args))
              .then(priority => cb(null, priority))
              .catch(err => cb(err))
        }

        if (concurrent.strategy === 'stack') {
          concurrencyOptions.filo = true
        }
      } else {
        concurrencyOptions.concurrent = concurrent
      }

      context = new ConcurrencyContext(concurrencyOptions)
    }

    return (...args) =>
      new Promise((resolve, reject) => {
        context
          .push({ fn: (...args) => threadedFn(args, filename), args })
          .on('finish', resolve)
          .on('failed', reject)
      })
  } else {
    return (...args) => threadedFn(args, filename)
  }
}

/**
 * Creates a concurrency context to apply to branchy tasks
 * @param {object|number|'auto'} options Concurrency options
 */
branchy.createContext = function createContext(options) {
  const ConcurrencyContext = require('./context')
  return new ConcurrencyContext(options)
}

module.exports = branchy
