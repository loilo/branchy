// Wait for the start signal
process.on('message', ({ callback, args, env }) => {
  // Require from the source file
  const sourceRequire = new Proxy(require, {
    apply(target, thisArg, [descriptor]) {
      return Reflect.apply(require, thisArg, [
        require('module')._resolveFilename(descriptor, {
          id: env.__filename,
          filename: env.__filename,
          paths: require('module')._nodeModulePaths(env.__dirname)
        })
      ])
    }
  })

  // Create the function that will be called
  const globalsObj = Object.assign({ require: sourceRequire }, env)
  const globals = Object.keys(globalsObj).map(key => [key, globalsObj[key]])
  const globalsCode = globals
    .map(
      ([constName, value], index) => `let ${constName} = arguments[0][${index}]`
    )
    .join('; ')
  const globalsValues = globals.map(([, value]) => value)

  // Don't add any additional line breaks before the `callback`!
  // Stack trace processing relis on it being on line 2.

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    globalsCode +
      '; return Reflect.apply(\n' +
      callback +
      '\n, null, Array.from(arguments).slice(1))'
  )

  // Run the function
  new Promise((resolve, reject) => {
    resolve(fn(globalsValues, ...args))
  })
    // Send success
    .then(result => {
      process.send({
        type: 'result',
        result
      })
    })

    // Send error
    .catch(err => {
      // Manipulate stack trace to represent the source of the original function
      const lines = err.stack.split('\n')
      const stackIndex = lines.findIndex(line => line.match(/^\s*at /))

      if (stackIndex === -1) {
        process.send({
          type: 'error',
          name: err.name,
          message: err.message,
          stack: err.stack
        })
      } else {
        const stackLines = lines.slice(stackIndex)

        const firstIrrelevant = stackLines.findIndex(
          line => !line.match(/<anonymous>:[0-9]+:[0-9]+\)$/)
        )
        const relevantStackLines = stackLines.slice(0, firstIrrelevant)
        relevantStackLines.pop()

        const rewrittenRelevantStackLines = relevantStackLines.map(line =>
          line.replace(
            /^(\s*at .+?)\(eval .+<anonymous>:([0-9]+):([0-9]+)\)$/,
            (match, start, line, col) =>
              `${start}(${env.__filename}:${line - 2}:${col})`
          )
        )

        process.send({
          type: 'error',
          name: err.name,
          message: err.message,
          stack: rewrittenRelevantStackLines.join('\n')
        })
      }
    })
    .then(() => {
      process.exit()
    })
})
