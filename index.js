import fs from 'fs'
import thirtySix from './versions/0.36.x/index.js'
import thirtySeven from './versions/0.37.x/index.js'
import thirtyEight from './versions/0.38.x/index.js'
import thirtyNineYamux from './versions/0.39.x-yamux/index.js'
import thirtyNineMplex from './versions/0.39.x-mplex/index.js'
import timeout from 'p-timeout'

const TEST_TIMEOUT = Number(process.env.TIMEOUT || 30000)
const count = 1000 // how many messages to send
const chunkSizes = [
  Math.pow(2, 2), // 4B
  Math.pow(2, 4), // 16B
  Math.pow(2, 6), // 64B
  Math.pow(2, 8), // 256B
  Math.pow(2, 16), // 64KB
  Math.pow(2, 18), // 256KB
  Math.pow(2, 20) // 1MB
]

const versions = {
  '0.36.x': thirtySix,
  '0.37.x': thirtySeven,
  '0.38.x': thirtyEight,
  '0.39.x-mplex': thirtyNineMplex,
  '0.39.x-yamux': thirtyNineYamux
}

const results = {}

for (const [version, impl] of Object.entries(versions)) {
  for (let i = 0; i < chunkSizes.length; i++) {
    await impl.setUp()

    const chunkSize = chunkSizes[i]
    const data = new Uint8Array(chunkSize)
    let sendingTimes = []
    let receivingTimes = []

    results[chunkSize] = results[chunkSize] || []

    try {
      await timeout(impl.runTest(count, data, sendingTimes, receivingTimes), {
        milliseconds: TEST_TIMEOUT
      })

      sendingTimes = sendingTimes.sort()
      receivingTimes = receivingTimes.sort()

      if (sendingTimes.length !== count) {
        throw new Error('Did not send all messages')
      }

      if (receivingTimes.length !== count) {
        throw new Error('Did not receive all messages')
      }

      const times = sendingTimes.map((val, index) => {
        return receivingTimes[index] - val
      })

      const avg = Math.round(
        times.reduce((acc, curr) => acc + curr, 0) / times.length
      )

      results[chunkSize].push(avg)

      console.info(`${version}, ${chunkSize}, ${avg}`)
    } catch (err) {
      results[chunkSize].push(0)

      console.info(`${version}, ${chunkSize},`, err.message)
    }

    await impl.tearDown()
  }
}

const csvData = [
  [ 'bytes', ...Object.keys(versions) ].join(', ')
]

Object.entries(results).forEach(([chunkSize, averages]) => {
  csvData.push([
    chunkSize,
    ...averages
  ].join(', '))
})

fs.writeFileSync('results.csv', csvData.join('\r\n'))
