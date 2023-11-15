import fs from 'fs'
import { execa } from 'execa'
import timeout from 'p-timeout'
import defer from 'p-defer'
import prettyBytes from 'pretty-bytes'

const PROTOCOL = '/transfer-test/1.0.0'
const TEST_TIMEOUT = Number(process.env.TIMEOUT ?? 600000000)
const dataLength = Number(process.env.DATA_LENGTH ?? (Math.pow(2, 20) * 100)) // how much data to send
const repeat = Number(process.env.TEST_REPEAT ?? 5)

// chunk sizes for data
const chunkSizes = []

// 256 b - 2 MiB - important to test over the multiplexer chunk size limit
for (let i = 8; i <= 21; i++) {
  chunkSizes.push(Math.pow(2, i))
}

const versions = [
  '0.36.x',
  '0.37.x',
  '0.38.x',
  '0.39.x-mplex',
  '0.39.x-yamux',
  '0.40.x-mplex',
  '0.40.x-yamux',
  '0.45.x-mplex',
  '0.45.x-yamux',
  '0.46.x-mplex',
  '0.46.x-yamux'
]

const results = {}

for (const version of versions) {
  console.info(`testing ${version}`)

  for (let i = 0; i < chunkSizes.length; i++) {
    const chunkSize = chunkSizes[i]
    results[chunkSize] = results[chunkSize] || []

    let receiver
    let sender
    let time = Infinity

    // try each one 5 times and take the lowest value
    for (let attempt = 0; attempt < repeat; attempt++) {
      try {
        let result
        let multiaddr
        const multiaddrPromise = defer()

        //console.info(`PROTOCOL=${PROTOCOL} DATA_LENGTH=${dataLength} CHUNK_SIZE=${chunkSize} node ./versions/${version}/receiver.js`)

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
            result = Number(buf.toString())
          }
        })
        receiver.stderr.on('data', (buf) => {
          console.error('receiver', buf.toString().trim())
        })

        multiaddr = await timeout(multiaddrPromise.promise, {
          milliseconds: TEST_TIMEOUT
        })

        //console.info(`PROTOCOL=${PROTOCOL} DATA_LENGTH=${dataLength} CHUNK_SIZE=${chunkSize} RECEIVER_MULTIADDR=${multiaddr} node ./versions/${version}/sender.js`)

        sender = execa('node', [`./versions/${version}/sender.js`], {
          env: {
            DATA_LENGTH: dataLength,
            CHUNK_SIZE: chunkSize,
            RECEIVER_MULTIADDR: multiaddr,
            PROTOCOL
          }
        })

        sender.stdout.on('data', (buf) => {
          console.error('sender', buf.toString().trim())
        })
        sender.stderr.on('data', (buf) => {
          console.error('sender', buf.toString().trim())
        })

        await timeout(receiver, {
          milliseconds: TEST_TIMEOUT
        })

        // only take result if it is lower than previous tries
        if (result < time) {
          time = result
        }
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

    const megs = dataLength / Math.pow(2, 20)
    const secs = time / 1000

    console.info(`${prettyBytes(dataLength)} in ${prettyBytes(chunkSize)} chunks in ${time}ms at ${Math.round(megs / secs)}MB/s`)
    results[chunkSize].push(time)
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
