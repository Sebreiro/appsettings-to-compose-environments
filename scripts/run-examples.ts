/**
 * Script to run conversion service examples
 */

import { runAllExamples } from '../src/core/example-usage'

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