const branchy = require('../lib/branchy')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

test('handles process numbers below threshold concurrently', () => {
  const results = []
  const sleeper = branchy(sleep, { concurrent: 2 })

  return Promise.all([
    sleeper(300).then(() => results.push(1)),
    sleeper(0).then(() => results.push(2))
  ]).then(() => {
    expect(results).toEqual([2, 1])
  })
})

test('respects call priority', () => {
  const results = []
  const sleeper = branchy(sleep, {
    concurrent: { threads: 1, priority: num => num }
  })

  return Promise.all([
    sleeper(300).then(() => results.push(1)),
    sleeper(0).then(() => results.push(2))
  ]).then(() => {
    expect(results).toEqual([1, 2])
  })
})

test('handles process numbers above threshold sequentially', () => {
  const results = []
  const sleeper = branchy(sleep, { concurrent: 1 })

  return Promise.all([
    sleeper(300).then(() => results.push(1)),
    sleeper(0).then(() => results.push(2))
  ]).then(() => {
    expect(results).toEqual([1, 2])
  })
})

test('handles concurrency threshold independently', () => {
  const results = []
  const sleeper1 = branchy(sleep, { concurrent: 1 })
  const sleeper2 = branchy(sleep, { concurrent: 1 })

  return Promise.all([
    sleeper1(300).then(() => results.push(1)),
    sleeper2(0).then(() => results.push(2))
  ]).then(() => {
    expect(results).toEqual([2, 1])
  })
})

test('handles stacks correctly', () => {
  const results = []
  const sleeper = branchy(sleep, {
    concurrent: { threads: 1, strategy: 'stack' }
  })

  return Promise.all([
    sleeper(0).then(() => results.push(1)),
    sleeper(300).then(() => results.push(2))
  ]).then(() => {
    expect(results).toEqual([2, 1])
  })
})

test('handles shared context correctly', () => {
  const results = []
  const context = branchy.createContext({ concurrent: 1 })
  const sleeper1 = branchy(sleep, { concurrent: context })
  const sleeper2 = branchy(sleep, { concurrent: context })

  return Promise.all([
    sleeper1(300).then(() => results.push(1)),
    sleeper2(0).then(() => results.push(2))
  ]).then(() => {
    expect(results).toEqual([1, 2])
  })
})
