// Wait for the start signal
process.on('message', ({ callback, args, env }) => {
  // Require from the source file
  const sourceRequire = new Proxy(require, {
    apply (target, thisArg, [ descriptor ]) {
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
  // eslint-disable-next-line no-new-func
  const fn = new Function('Object.assign(global, arguments[0]); return Reflect.apply(\n' + callback + '\n, null, Array.from(arguments).slice(1))')

  // Run the function
  new Promise((resolve, reject) => {
    resolve(fn(
      {
        require: sourceRequire,
        ...env
      },
      ...args
    ))
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

        const firstIrrelevant = stackLines.findIndex(line => !line.match(/<anonymous>:[0-9]+:[0-9]+\)$/))
        const relevantStackLines = stackLines.slice(0, firstIrrelevant)
        relevantStackLines.pop()

        const rewrittenRelevantStackLines = relevantStackLines
          .map(line => line.replace(/^(\s*at .+?)\(eval .+<anonymous>:([0-9]+):([0-9]+)\)$/, (match, start, line, col) => `${start}(${env.__filename}:${line - 2}:${col})`))

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
