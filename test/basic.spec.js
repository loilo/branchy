const branchy = require('../lib/branchy')

test('gets correct result for basic synchronous functions', () => {
  return branchy((...numbers) => {
    return numbers.reduce((carry, current) => carry + current, 0)
  })(1, 2, 3).then(result => {
    expect(result).toBe(6)
  })
})

test('gets correct result for basic asynchronous functions', () => {
  return branchy(
    () =>
      new Promise(resolve => {
        setTimeout(() => resolve('foo'), 50)
      })
  )().then(result => {
    expect(result).toBe('foo')
  })
})

test('re-throws errors', () => {
  return branchy(() => {
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
  return branchy('./modules/add')(1, 2, 3).then(result => {
    expect(result).toBe(6)
  })
})

test('function has correct __filename and __dirname', () => {
  const filename = branchy(() => {
    return __filename
  }, {concurrent: 'auto'})().then(result => {
    expect(result).toBe(__filename)
  })

  const dirname = branchy(() => {
    return __dirname
  }, {concurrent: 'auto'})().then(result => {
    expect(result).toBe(__dirname)
  })

  return Promise.all([ filename, dirname ])
})

test('module has correct __filename', () => {
  const { join } = require('path')
  const testDirname = __dirname

  return branchy('./modules/constants')().then(result => {
    expect(result).toBe(join(testDirname, 'modules', 'constants.js'))
  })
})

test('function does require() correctly', () => {
  return branchy((...args) => {
    return require('./modules/add')(...args)
  })(1, 2, 3).then(result => {
    expect(result).toBe(6)
  })
})

test('module does require() correctly', () => {
  return branchy('./modules/require')(1, 2, 3).then(result => {
    expect(result).toBe(6)
  })
})
