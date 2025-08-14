/**
 * JavaScript version for direct Node.js execution
 */

// Import using require for Node.js compatibility
const { runAllExamples } = require('../dist/src/core/example-usage.js')

// Execute all examples
runAllExamples()
  .then(() => {
    console.log('\n🎉 All examples completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error running examples:', error)
    process.exit(1)
  })