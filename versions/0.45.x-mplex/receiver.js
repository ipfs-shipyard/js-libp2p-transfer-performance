import { createLibp2p } from 'libp2p'
import { plaintext } from 'libp2p/insecure'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'

const toReceive = Number(process.env.DATA_LENGTH)

const node = await createLibp2p({
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0'],
  },
  transports: [
    tcp()
  ],
  streamMuxers: [
    mplex()
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

let received = 0

await node.handle(process.env.PROTOCOL, async ({ stream }) => {
  const start = Date.now()

  for await (const buf of stream.source) {
    received += buf.byteLength

    if (received >= toReceive) {
      process.stdout.write(`${Date.now() - start}`)
      await node.stop()
    }
  }
})

console.info(`${node.getMultiaddrs()[0]}`)
