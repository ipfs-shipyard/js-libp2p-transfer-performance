import fs from 'fs'
import { execa } from 'execa'
import timeout from 'p-timeout'
import defer from 'p-defer'

const PROTOCOL = '/transfer-test/1.0.0'
const TEST_TIMEOUT = Number(process.env.TIMEOUT || 30000)
const dataLength = Number(process.env.DATA_LENGTH || (Math.pow(2, 20) * 100)) // how much data to send
const chunkSizes = [ // chunk sizes for data
  Math.pow(2, 10), // 1 KiB
  Math.pow(2, 16), // 64 KiB
  Math.pow(2, 17), // 128 KiB
  Math.pow(2, 18), // 256 KiB
  Math.pow(2, 20), // 1 MiB
  Math.pow(2, 20) * 2, // 2 MiB
  Math.pow(2, 20) * 10 // 10 MiB
]

const versions = [
  '0.36.x',
  '0.37.x',
  '0.38.x',
  '0.39.x-mplex',
  '0.39.x-yamux'
]

const results = {}

for (const version of versions) {
  console.info(`testing ${version}`)

  for (let i = 0; i < chunkSizes.length; i++) {
    const chunkSize = chunkSizes[i]
    results[chunkSize] = results[chunkSize] || []

    let receiver
    let sender

    try {
      let multiaddr
      const multiaddrPromise = defer()
      let time

      receiver = execa('node', [`./versions/${version}/receiver.js`], {
        env: {
          DATA_LENGTH: dataLength,
          PROTOCOL
        }
      })
      receiver.stdout.on('data', (buf) => {
        if (!multiaddr) {
          multiaddrPromise.resolve(buf.toString().trim())
        } else {
          time = Number(buf.toString())
        }
      })
      receiver.stderr.on('data', (buf) => {
        console.error('receiver', buf.toString().trim())
      })

      multiaddr = await timeout(multiaddrPromise.promise, {
        milliseconds: TEST_TIMEOUT
      })

      sender = execa('node', [`./versions/${version}/sender.js`], {
        env: {
          DATA_LENGTH: dataLength,
          CHUNK_SIZE: chunkSize,
          RECEIVER_MULTIADDR: multiaddr,
          PROTOCOL
        }
      })

      sender.stderr.on('data', (buf) => {
        console.error('sender', buf.toString().trim())
      })

      await timeout(receiver, {
        milliseconds: TEST_TIMEOUT
      })

      results[chunkSize].push(time)

      console.info(`${dataLength}b in ${chunkSize}b chunks in ${time}ms`)
    } catch (err) {
      results[chunkSize].push('')

      console.info(`${version}, ${chunkSize},`, err.message)
    } finally {
      if (receiver != null) {
        receiver.kill()
      }

      if (sender != null) {
        sender.kill()
      }
    }
  }
}

const csvData = [
  [ 'chunk size (b)', ...versions ].join(', ')
]

Object.entries(results).forEach(([chunkSize, averages]) => {
  csvData.push([
    chunkSize,
    ...averages
  ].join(', '))
})

fs.writeFileSync('results.csv', csvData.join('\r\n'))
