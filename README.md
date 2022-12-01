# js-libp2p-transfer-performance

A simple project to track transfer performance over different libp2p releases.

## Usage

Clone the repo, install the deps and run `npm start`:

```console
$ git clone git@github.com:ipfs-shipyard/js-libp2p-transfer-performance.git
$ cd js-libp2p-transfer-performance
$ npm i
$ npm start

> js-libp2p-transfer-performance@1.0.0 start
> node index.js

testing 0.36.x
105 MB in 256 B chunks in 1127ms at 89MB/s
105 MB in 512 B chunks in 592ms at 169MB/s
105 MB in 1.02 kB chunks in 332ms at 301MB/s
105 MB in 2.05 kB chunks in 204ms at 490MB/s
...
```

## About

The test spawns two processes for each configured version that both start a libp2p node.

A protocol stream is opened between the two nodes and 100MiB is transferred with a configured chunk size and the time taken is logged to the console.

This is repeated with ever increasing chunk sizes.

It runs each chunk size test five times and takes the fastest time.

The recorded times are stored in `results.csv` which can be used to create a graph.

## Configuration

Env vars can be used to override the test parameters.

- `TIMEOUT` how long each transfer is allowed to take in ms (default: 30s)
- `DATA_LENGTH` how much data to transfer in bytes (default: 100MiB)
- `TEST_REPEAT` how many times to repeat each test (default: 5)
