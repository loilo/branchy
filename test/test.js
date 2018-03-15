const branchy = require('../index')

test('gets correct result for basic synchronous functions', async () => {
  expect(await branchy((...numbers) => {
    return numbers.reduce((carry, current) => carry + current, 0)
  })(1, 2, 3)).toBe(6)
})

test('gets correct result for basic asynchronous functions', async () => {
  expect(await branchy(() => new Promise(resolve => {
    setTimeout(() => resolve('foo'), 50)
  }))()).toBe('foo')
})

test('re-throws errors', async () => {
  await branchy(() => {
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

test('finds and executes module descriptors', async () => {
  expect(await branchy('./modules/add')(1, 2, 3)).toBe(6)
})

test('function has correct __filename and __dirname', async () => {
  const { join } = require('path')
  const testDirname = __dirname

  expect(await branchy(() => {
    return __filename
  })()).toBe(join(testDirname, 'test.js'))

  expect(await branchy(() => {
    return __dirname
  })()).toBe(testDirname)
})

test('module has correct __filename', async () => {
  const { join } = require('path')
  const testDirname = __dirname

  expect(await branchy('./modules/constants')()).toBe(join(testDirname, 'modules', 'constants.js'))
})

test('function does require() correctly', async () => {
  expect(await branchy((...args) => {
    return require('./modules/add')(...args)
  })(1, 2, 3)).toBe(6)
})

test('module does require() correctly', async () => {
  expect(await branchy('./modules/require')(1, 2, 3)).toBe(6)
})
