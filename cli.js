#!/usr/bin/env node
const cli = require('cac')()
const filesize = require('filesize')
const LogHorizon = require('log-horizon')
const ncdus3 = require('./ncdus3')
const fs = require('fs')

const scan = async (s3location, ncdujson, combineFiles) => {
  const s3PathRegex = /s3:\/\/(?<bucket>\w+)\/(?<prefix>.*)/
  const match = s3PathRegex.exec(s3location)
  if (match == null) {
    console.error('invalid s3location, please check your input.')
    process.exit(1)
  }
  const logger = new LogHorizon()
  let [totalSize, fileCount] = [0, 0]

  const startTime = new Date()
  const result = await ncdus3.generateFeed(match.groups.bucket, match.groups.prefix, combineFiles, (keys) => {
    fileCount += keys.length
    totalSize += keys.reduce((agg, x) => agg + x.Size, 0)
    const duration = Math.floor((new Date() - startTime) / 1000)
    logger.progress(`Listing S3 objects...  TotalSize: ${filesize(totalSize)}  FileCount: ${fileCount}  ElapsedTime: ${duration}s`)
  })
  fs.writeFileSync(ncdujson, result.join('\n'))

  logger.success('Done! You can view the result now.')
  logger.success('ncdu -f ' + ncdujson)
}

cli.command('scan <s3location> <ncdujson>', 'Scan S3 and generate ncdu feed')
  .option('--no-combine', 'Do not combine files, will generate bigger feed')
  .example('* ncdus3 scan s3://bucketname/path/path2 output.json')
  .action((s3location, ncdujson, options) => {
    scan(s3location, ncdujson, options.combine)
  })

cli.command('').action(() => cli.outputHelp())
cli.help()
cli.parse()
