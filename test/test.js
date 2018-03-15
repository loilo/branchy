const branchy = require('../index')

test('gets correct result for basic synchronous functions', () => {
  branchy((...numbers) => {
    return numbers.reduce((carry, current) => carry + current, 0)
  })(1, 2, 3)
  .then(result => {
    expect(result).toBe(6)
  })
})

test('gets correct result for basic asynchronous functions', () => {
  branchy(() => new Promise(resolve => {
    setTimeout(() => resolve('foo'), 50)
  }))()
  .then(result => {
    expect(result).toBe('foo')
  })
})

test('re-throws errors', () => {
  branchy(() => {
    throw new Error('Some error inside threaded function')
  })()
    .then(() => {
      throw new Error('It did not throw where it should')
    })
    .catch(err => {
      // Re-throw all but BranchyErrors
      if (err.name !== 'BranchyError') throw err
    })
})

test('finds and executes module descriptors', () => {
  branchy('./modules/add')(1, 2, 3)
  .then(result => {
    expect(result).toBe(6)
  })
})

test('function has correct __filename and __dirname', () => {
  const { join } = require('path')
  const testDirname = __dirname

  branchy(() => {
    return __filename
  })()
  .then(result => {
    expect(result).toBe(join(testDirname, 'test.js'))
  })

  branchy(() => {
    return __dirname
  })()
  .then(result => {
    expect(result).toBe(testDirname)
  })
})

test('module has correct __filename', () => {
  const { join } = require('path')
  const testDirname = __dirname

  branchy('./modules/constants')()
  .then(result => {
    expect(result).toBe(join(testDirname, 'modules', 'constants.js'))
  })
})

test('function does require() correctly', () => {
  branchy((...args) => {
    return require('./modules/add')(...args)
  })(1, 2, 3)
  .then(result => {
    expect(result).toBe(6)
  })
})

test('module does require() correctly', () => {
  branchy('./modules/require')(1, 2, 3)
  .then(result => {
    expect(result).toBe(6)
  })
})
