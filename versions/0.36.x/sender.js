#!/usr/bin/env node

import libp2p from 'libp2p'
import Insecure from 'libp2p/src/insecure/plaintext.js'
import Mplex from 'libp2p-mplex'
import TCP from 'libp2p-tcp'

let toSend = Number(process.env.DATA_LENGTH)
const data = new Uint8Array(Number(process.env.CHUNK_SIZE))

const node = await libp2p.create({
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0'],
  },
  modules: {
    transport: [TCP],
    streamMuxer: [Mplex],
    connEncryption: [Insecure]
  }
})

await node.start()

const { stream } = await node.dialProtocol(
  process.env.RECEIVER_MULTIADDR,
  process.env.PROTOCOL
)

await stream.sink(async function * () {
  while (toSend > 0) {
    toSend -= data.byteLength
    yield data
  }
}())
