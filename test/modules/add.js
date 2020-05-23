module.exports = (...numbers) =>
  numbers.reduce((carry, current) => carry + current, 0)
