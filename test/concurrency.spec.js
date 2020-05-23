const branchy = require('../lib/branchy')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

test('handles process numbers below threshold concurrently', async () => {
  const results = []
  const sleeper = branchy(sleep, { concurrent: 2 })

  const call1 = sleeper(300).then(() => results.push(1))
  const call2 = sleeper(0).then(() => results.push(2))

  await Promise.all([call1, call2])

  expect(results).toEqual([2, 1])
})

test('respects call priority', async () => {
  const results = []
  const sleeper = branchy(sleep, {
    concurrent: { threads: 1, priority: num => num }
  })

  const call1 = sleeper(300).then(() => results.push(1))
  const call2 = sleeper(0).then(() => results.push(2))

  await Promise.all([call1, call2])

  expect(results).toEqual([1, 2])
})

test('handles process numbers above threshold sequentially', async () => {
  const results = []
  const sleeper = branchy(sleep, { concurrent: 1 })

  const call1 = sleeper(300).then(() => results.push(1))
  const call2 = sleeper(0).then(() => results.push(2))

  await Promise.all([call1, call2])

  expect(results).toEqual([1, 2])
})

test('handles concurrency threshold independently', async () => {
  const results = []
  const sleeper1 = branchy(sleep, { concurrent: 1 })
  const sleeper2 = branchy(sleep, { concurrent: 1 })

  const call1 = sleeper1(300).then(() => results.push(1))
  const call2 = sleeper2(0).then(() => results.push(2))

  await Promise.all([call1, call2])

  expect(results).toEqual([2, 1])
})

test('handles stacks correctly', async () => {
  const results = []
  const sleeper = branchy(sleep, {
    concurrent: { threads: 1, strategy: 'stack' }
  })

  const call1 = sleeper(0).then(() => results.push(1))
  const call2 = sleeper(300).then(() => results.push(2))

  await Promise.all([call1, call2])

  expect(results).toEqual([2, 1])
})

test('handles shared context correctly', async () => {
  const results = []
  const context = branchy.createContext({ concurrent: 1 })
  const sleeper1 = branchy(sleep, { concurrent: context })
  const sleeper2 = branchy(sleep, { concurrent: context })

  const call1 = sleeper1(300).then(() => results.push(1))
  const call2 = sleeper2(0).then(() => results.push(2))

  await Promise.all([call1, call2])

  expect(results).toEqual([1, 2])
})
