# Branchy

This is a zero-dependency library to easily run computation-heavy functions in a separate thread.

```bash
npm install --save git+https://git@github.com/Loilo/branchy.git
```

## Usage
The most simple (and horribly inefficient) case:

```javascript
const branchy = require('branchy')

const threadedAdder = branchy((...numbers) => {
  return numbers.reduce((carry, current) => carry + current, 0)
})

await threadedAdder(2, 3) // 5
```

Alternatively, you could put the function in its own file and pass that to `branchy`:

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
The technical procedures of `branchy` sets some requirements for threaded functions:

* Parameters passed to a threaded function are serialized. That means, threaded functions should only accept serializeable arguments. The same goes for return values of these functions.
* Threaded functions are serialized before being run in a different thread. That means, they have no access to the local variable scope that was available during their definition:

  ```javascript
  const branchy = require('branchy')

  const foo = 42

  branchy(() => {
    return foo // ReferenceError: foo is not defined
  })
  ```
* While the outer scope is not available in a threaded function, the `__filename` and `__dirname` variables are funnelled into the function with the values they have at the definition location.
  Also, the `require()` function works as expected – it resolves modules relative to the definition location.
