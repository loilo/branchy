![Branchy](branchy.png)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Travis](https://img.shields.io/travis/Loilo/branchy.svg?label=unix&logo=travis)](https://travis-ci.org/Loilo/branchy)
[![AppVeyor](https://img.shields.io/appveyor/ci/Loilo/branchy.svg?label=windows&logo=appveyor)](https://ci.appveyor.com/project/Loilo/branchy)
[![npm](https://img.shields.io/npm/v/branchy.svg)](https://www.npmjs.com/package/branchy)

Comfortly run Node.js functions in a separate process.

```javascript
const threadedAsyncFunction = branchy(heavySyncFunction)
```

## Installation

```bash
npm install --save branchy
```

## Basic Usage

It's super easy — pass your function to `branchy` and get an asynchronous, Promise-returning version of it:

```javascript
const branchy = require('branchy')

// Synchronous "add", returns number
const adder = (a, b) => a + b

// Asynchronous, threaded "add", returns Promise that resolves to number
const threadedAdder = branchy(adder)

// Don't forget to wrap in async function
await threadedAdder(2, 3) // 5

// This example just adds two numbers, please don't ever
// put that work into a thread in a real-world scenario
```

Alternatively, you could put the function in its own file and pass the file path to `branchy`:

```javascript
// add.js
module.exports = (a, b) => a + b

// index.js
const threadedAdder = branchy('./add')

await threadedAdder(2, 3) // 5
```

## Caveats

The technical procedures of `branchy` set some requirements for threaded functions:

- Parameters passed to a threaded function are serialized. That means, threaded functions should only accept serializeable arguments. The same goes for their return values.
- Threaded functions are serialized before being run in a different thread. Consequently, they have no access to the local variable scope that was available during their definition:

  ```javascript
  const branchy = require('branchy')

  const foo = 42

  branchy(() => {
    return foo // ReferenceError: foo is not defined
  })
  ```

- Although the outer scope is not available in a threaded function, the `__filename` and `__dirname` variables are funnelled into the function with the values they have at the definition location.

  Also, the `require()` function works as expected – it resolves modules relative to the file where `branchy()` was called.

## Advanced Usage

### Concurrency Control

To avoid sharing work among too many threads, you may need to restrict how many threads a function may create at the same time. For this use case, `branchy` offers some simple concurrency control.

Enable concurrency control by passing an optional second argument to the `branchy()` function, specifying the `concurrent` option:

```javascript
const fn = branchy('./computation-heavy-sync-task', { concurrent: 4 })
```

No matter how often you call `fn()`, there will be no more than 4 threads of it running at the same time. Each additional call will be queued and executed as soon as a previous call finishes.

> **Note:** Passing a number as the `concurrent` option actually is a shorthand, you may pass an object to refine concurrency control:
>
> ```javascript
> { concurrent: 4 }
>
> // is equivalent to
>
> {
>   concurrent: {
>     threads: 4,
>     // other options
>   }
> }
> ```

#### Automatically Choose Number of Concurrent Threads

To restrict concurrency to the number of available CPU cores, use `{ concurrent: 'auto' }`.

#### Priority

You may define the priority of each call depending on its arguments:

```javascript
const call = branchy(name => console.log('Call %s', name), {
  concurrent: {
    threads: 1, // Only one at a time for demoing purposes
    priority: name => (name === 'Ghostbusters' ? 100 : 1)
  }
})

call('Alice')
call('Bob')
call('Ghostbusters')

// "Call Ghostbusters", "Call Alice", "Call Bob"
```

- The `priority()` function will be passed the same arguments as the threaded function itself.
- Priority may be determined asynchronously (by returning a Promise).

#### Call Order Strategy

By default, the queue starts threads in the order functions were called ([first-in, first-out](<https://en.wikipedia.org/wiki/FIFO_(computing_and_electronics)>)). However you can make the queue handle the latest calls first (technically making it a [Stack](<https://en.wikipedia.org/wiki/Stack_(abstract_data_type)>)) by setting the `strategy`:

```javascript
{
  concurrent: {
    strategy: 'stack'
  }
}
```

#### Concurrency Contexts

While you now may control how many threads a _single_ function creates, thread limits are function-bound and not enforced across _different_ Branchy functions:

```javascript
const inc = branchy(num => num + 1, { concurrent: 2 })
const dec = branchy(num => num - 1, { concurrent: 2 })

// This opens 2 threads
inc(1)
inc(2)
inc(3)

// Another function, another context, so it opens another 2 threads
dec(1)
dec(2)
dec(3)
```

This is where concurrency contexts come in. A context encapsulates a concurrency configuration in a shareable `ConcurrencyContext` object with a single queue attached to it.

Create it like so:

```javascript
const ctx = branchy.createContext({
  threads: 2
})
```

Now share the `ctx` across multiple threaded functions, so the example above works as expected:

```javascript
const inc = branchy(num => num + 1, { concurrent: ctx })
const dec = branchy(num => num - 1, { concurrent: ctx })

// This opens 2 threads
inc(1)
inc(2)
inc(3)

// This correctly queues dec() calls after inc() calls
dec(1)
dec(2)
dec(3)
```

#### Access the Queue

A `ConcurrencyContext` is just an extended [Queue](https://www.npmjs.com/package/better-queue).

If you need more fine-grained control over currently running tasks, you may create a context for that:

```javascript
const ctx = branchy.createContext({ threads: 4 })

// For more information about the available API, see the `better-queue` docs
ctx.on('drain', () => {
  console.log('All calls have been executed!')
})

// ...use the `ctx` context in branchy() calls
```
