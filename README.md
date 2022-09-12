# js-libp2p-transfer-performance

A simple project to track transfer performance over different libp2p releases.

## Usage

Clone the repo, install the deps and run `npm start`:

```console
$ git clone git@github.com:ipfs-shipyard/js-libp2p-transfer-performance.git
$ cd js-libp2p-transfer-performance
$ npm i
$ npm start
testing 0.36.x
104857600b in 1024b chunks in 600ms
104857600b in 65536b chunks in 217ms
...
```

## About

The test spawns two processes for each configured version that both start a libp2p node.

A protocol stream is opened between the two nodes and 100MiB is transferred with a configured chunk size and the time taken is logged to the console.

This is repeated with ever increasing chunk sizes.

The recorded times are stored in `results.csv` which can be used to create a graph.

## Configuration

Env vars can be used to override the test parameters.

- `TIMEOUT` how long each transfer is allowed to take in ms (default: 30s)
- `DATA_LENGTH` how much data to transfer in bytes (default: 100MiB)