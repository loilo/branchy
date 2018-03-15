# Branchy
![Travis](https://img.shields.io/travis/Loilo/branchy.svg)
![npm](https://img.shields.io/npm/v/branchy.svg)

A zero-dependency library to comfortly run Node.js functions in a separate thread.

## Installation

```bash
npm install --save branchy
```

## Usage
It's super easy: Pass your function to `branchy` and get an asynchronous, Promise-returning version of it.

The most simple (and horribly inefficient) case:

```javascript
const branchy = require('branchy')

// Synchronous "add", returns number
const adder = (...numbers) => {
  return numbers.reduce((carry, current) => carry + current, 0)
}

// Asynchronous, threaded "add", returns Promise that resolves to number
const threadedAdder = branchy(adder)

// Don't forget to wrap in async function
await threadedAdder(2, 3) // 5
```

Alternatively, you could put the function in its own file and pass the file path to `branchy`:

```javascript
// add.js
module.exports = (...numbers) => {
  return numbers.reduce((carry, current) => carry + current, 0)
}

// index.js
const threadedAdder = branchy('./add')

await threadedAdder(2, 3) // 5
```

### Gotchas
The technical procedures of `branchy` set some requirements for threaded functions:

* Parameters passed to a threaded function are serialized. That means, threaded functions should only accept serializeable arguments. The same goes for their return values.
* Threaded functions are serialized before being run in a different thread. Consequently, they have no access to the local variable scope that was available during their definition:

  ```javascript
  const branchy = require('branchy')

  const foo = 42

  branchy(() => {
    return foo // ReferenceError: foo is not defined
  })
  ```
* Although the outer scope is not available in a threaded function, the `__filename` and `__dirname` variables are funnelled into the function with the values they have at the definition location.

  Also, the `require()` function works as expected – it resolves modules relative to the definition location.
