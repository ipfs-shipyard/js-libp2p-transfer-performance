#!/usr/bin/env node

const { create } = require('libp2p')
const Insecure = require('libp2p/src/insecure/plaintext')
const Mplex = require('libp2p-mplex')
const TCP = require('libp2p-tcp')
const defer = require('p-defer')

const PROTOCOL = '/transfer-test/1.0.0'

let nodeA
let nodeB

async function setUp () {
  nodeA = await create({
    addresses: {
      listen: ["/ip4/127.0.0.1/tcp/0"],
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [Insecure]
    }
  })
  nodeB = await create({
    addresses: {
      listen: ["/ip4/127.0.0.1/tcp/0"],
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [Insecure]
    }
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
  const multiaddr = `${nodeB.multiaddrs[0]}/p2p/${nodeB.peerId}`
  let deferred = defer()
  let received = 0

  await nodeB.handle(PROTOCOL, async ({ stream }) => {
    for await (const _ of stream.source) {
      received++
      receivingTimes.push(Date.now())

      if (received === count) {
        deferred.resolve()
        stream.close()
      }
    }
  })

  const { stream } = await nodeA.dialProtocol(multiaddr, PROTOCOL)

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

module.exports = {
  setUp,
  runTest,
  tearDown
}
