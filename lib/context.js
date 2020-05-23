const Queue = require('better-queue')

/**
 * Concurrency Context, shareable between branchy() calls
 */
class ConcurrencyContext extends Queue {
  constructor(options) {
    super(({ fn, args }, cb) => {
      fn(...args)
        .then(result => cb(null, result))
        .catch(err => cb(err))
    }, options)
  }
}

module.exports = ConcurrencyContext
