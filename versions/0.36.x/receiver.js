import libp2p from 'libp2p'
import Insecure from 'libp2p/src/insecure/plaintext.js'
import Mplex from 'libp2p-mplex'
import TCP from 'libp2p-tcp'

const toReceive = Number(process.env.DATA_LENGTH)

const node = await libp2p.create({
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0'],
  },
  modules: {
    transport: [TCP],
    streamMuxer: [Mplex],
    connEncryption: [Insecure]
  },
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
    received += buf.length

    if (received >= toReceive) {
      process.stdout.write(`${Date.now() - start}`)
      await node.stop()
    }
  }
})

console.info(`${node.multiaddrs[0]}/p2p/${node.peerId}`)
