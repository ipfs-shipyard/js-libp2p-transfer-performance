import { createLibp2p } from 'libp2p'
import { plaintext } from 'libp2p/insecure'
import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'

let toSend = Number(process.env.DATA_LENGTH)
const data = new Uint8Array(Number(process.env.CHUNK_SIZE))

const node = await createLibp2p({
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0'],
  },
  transports: [
    tcp()
  ],
  streamMuxers: [
    yamux()
  ],
  connectionEncryption: [
    plaintext()
  ],
  config: {
    nat: {
      enabled: false
    }
  }
})

await node.start()

const stream = await node.dialProtocol(multiaddr(process.env.RECEIVER_MULTIADDR), process.env.PROTOCOL)

await stream.sink(async function * () {
  while (toSend > 0) {
    toSend -= data.byteLength
    yield data
  }
}())
