const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const util = require('util')

const listObjectsV2Async = util.promisify(
  (params, cb) => s3.listObjectsV2(
    params,
    (err, data) => cb(err, data)
  )
)

const listS3Keys = async (bucket, prefix, continuationToken) => {
  const params = {
    Bucket: bucket,
    Prefix: prefix,
    ContinuationToken: continuationToken
  }
  return await listObjectsV2Async(params)
}

// Key data sample:
// { Key:
//   'full/file/name',
//  LastModified: 2019-04-21T16:27:29.000Z,
//  ETag: '"abcdefg"',
//  Size: 94487693,
//  StorageClass: 'STANDARD' }

const scanS3 = async (bucket, prefix, onData) => {
  let nextContinuationToken = undefined
  while (true) {
    const data = await listS3Keys(bucket, prefix, nextContinuationToken)
    const keys = data.Contents.map(k => ({ Key: k.Key, Size: k.Size })) // reduce data to save memory
    if (onData != null) {
      onData({ keys })
    }
    if (!data.IsTruncated) {
      break
    }
    nextContinuationToken = data.NextContinuationToken
  }
}

// ncdu jsonfmt: https://dev.yorhel.nl/ncdu/jsonfmt
const generateFeed = async (bucket, prefix, combineFiles=true, onData=null) => {
  const feedLines = [
    `[1,0,{"timestamp":${Math.floor(new Date().getTime() / 1000)},"progver":"0.1.0","progname":"ncdus3"}`,
    `,[{"name":"s3://${bucket}/${prefix}"}`
  ]
  // Amazon S3 lists objects in UTF-8 character encoding in lexicographical order
  let currentRelativePath = []
  const aggregated = { size: 0, fileCount: 0 }
  await scanS3(bucket, prefix, (data) => {
    data.keys.forEach(key => {
      const relativePath = key.Key.replace(prefix, '').split('/').filter(p => p) // the next currentRelativePath
      const fileName = relativePath.pop()
      // compare currentRelativePath and relativePath, find the index of first difference
      let diffIdx = currentRelativePath.length
      for (let idx = 0; idx < currentRelativePath.length; idx++) {
        if (currentRelativePath[idx] !== relativePath[idx]) {
          diffIdx = idx
          break
        }
      }
      // if the directory changes, handle it
      if (diffIdx !== currentRelativePath.length || diffIdx !== relativePath.length) {
        // close the opening dirs
        if (currentRelativePath.length > diffIdx) {
          if (combineFiles && aggregated.fileCount) {
            feedLines.push(`,{"dsize":${aggregated.size},"name":"${aggregated.fileCount}_FILES"}`)
            aggregated.size = 0
            aggregated.fileCount = 0
          }
          feedLines.push(']'.repeat(currentRelativePath.length - diffIdx))
        }
        // append new dirs
        relativePath.slice(diffIdx).forEach(dir => {
          feedLines.push(`,[{"name":"${dir}"}`)
        })
        currentRelativePath = relativePath
      }
      // append new file, or do aggregation
      if (combineFiles) {
        aggregated.size += key.Size
        aggregated.fileCount++
      } else {
        feedLines.push(`,{"dsize":${key.Size},"name":"${fileName}"}`)
      }
    })
    if (onData) {
      onData(data.keys)
    }
  })
  if (combineFiles && aggregated.fileCount) {
    feedLines.push(`,{"dsize":${aggregated.size},"name":"${aggregated.fileCount}_FILES"}`)
  }
  feedLines.push(']'.repeat(2 + currentRelativePath.length))

  return feedLines
}

module.exports = {
  scanS3,
  generateFeed
}
