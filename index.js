import fs from 'fs'
import { execa } from 'execa'
import timeout from 'p-timeout'
import defer from 'p-defer'
import prettyBytes from 'pretty-bytes'

const PROTOCOL = '/transfer-test/1.0.0'
const TEST_TIMEOUT = Number(process.env.TIMEOUT || 60000)
const dataLength = Number(process.env.DATA_LENGTH || (Math.pow(2, 20) * 100)) // how much data to send

// chunk sizes for data
const chunkSizes = []

// 256 b - 1 MiB
for (let i = 8; i <= 20; i++) {
  chunkSizes.push(Math.pow(2, i))
}

// test over the multiplexer chunk size limit as well
chunkSizes.push(
  Math.pow(2, 20) * 2, // 2 MiB
  Math.pow(2, 20) * 10 // 10 MiB
)

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

      console.info(`${prettyBytes(dataLength)} in ${prettyBytes(chunkSize)} chunks in ${time}ms`)
    } catch (err) {
      results[chunkSize].push('')

      console.info(`${prettyBytes(dataLength)} in ${prettyBytes(chunkSize)} chunks - error:`, err.message)
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
  [ 'chunk size', ...versions ].join(', ')
]

Object.entries(results).forEach(([chunkSize, averages]) => {
  csvData.push([
    chunkSize === '' ? '' : prettyBytes(Number(chunkSize)),
    ...averages
  ].join(', '))
})

fs.writeFileSync('results.csv', csvData.join('\r\n'))
