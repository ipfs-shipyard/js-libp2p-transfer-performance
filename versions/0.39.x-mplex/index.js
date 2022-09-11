#!/usr/bin/env node

import { createLibp2p } from 'libp2p'
import { Plaintext } from 'libp2p/insecure'
import { Mplex } from '@libp2p/mplex'
import { TCP } from '@libp2p/tcp'
import defer from 'p-defer'

const PROTOCOL = '/transfer-test/1.0.0'

let nodeA
let nodeB

async function setUp () {
  nodeA = await createLibp2p({
    addresses: {
      listen: ["/ip4/127.0.0.1/tcp/0"],
    },
    transports: [
      new TCP()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Plaintext()
    ]
  })
  nodeB = await createLibp2p({
    addresses: {
      listen: ["/ip4/127.0.0.1/tcp/0"],
    },
    transports: [
      new TCP()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Plaintext()
    ]
  })

  await Promise.all([
    nodeA.start(),
    nodeB.start()
  ])
}

async function tearDown () {
  await Promise.all([
    nodeA.stop(),
    nodeB.stop()
  ])
}

async function runTest (count, data, sendingTimes, receivingTimes) {
  const multiaddr = nodeB.getMultiaddrs()[0]
  let deferred = defer()
  let received = 0

  await nodeB.handle(PROTOCOL, ({ stream }) => {
    Promise.resolve()
      .then(async () => {
        for await (const _ of stream.source) {
          received++
          receivingTimes.push(Date.now())

          if (received === count) {
            deferred.resolve()
            stream.close()
          }
        }
      })
  })

  const stream = await nodeA.dialProtocol(multiaddr, PROTOCOL)

  await stream.sink(async function * () {
    for (let i = 0; i < count; i++) {
      sendingTimes.push(Date.now())

      yield data

      await new Promise((resolve) => {
        setTimeout(() => resolve(), 1)
      })
    }

    await deferred.promise
  }())

  await nodeB.unhandle(PROTOCOL)
}

export default {
  setUp,
  runTest,
  tearDown
}
