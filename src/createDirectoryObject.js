/* eslint-disable */

var fs = require('fs')
var path = require('path')
var Q = require('q')
var stat = Q.denodeify(fs.stat.bind(fs))
var readdir = Q.denodeify(fs.readdir.bind(fs))

var sortType = require('./options/sortType')

var createDirectoryObject = function(rootDir, fileName, options) {
  var deferred = Q.defer()

  // Set option defaults
  options = typeof options === 'object' ? options : {}
  options.sortType = typeof options.sortType !== 'undefined' ? options.sortType : true
  options.fromDir = typeof options.fromDir !== 'undefined' ? options.fromDir : './'

  var currentDir = path.normalize(rootDir + '/' + fileName)

  var fileInfo = {
    set: path.relative(rootDir, path.dirname(currentDir)),
    path: path
      .relative(options.fromDir, './' + currentDir)
      .split(path.sep)
      .join('/'),
    name: path.basename(currentDir),
  }

  stat(currentDir)
    .then(function(stats) {
      // Check if file or directory
      fileInfo.type = stats.isFile() ? 'file' : 'directory'

      if (fileInfo.type === 'file') {
        deferred.resolve(fileInfo)
        throw new Error('Not a directory')
      } else {
        fileInfo.edges = []
      }

      return currentDir
    })
    .then(readdir)
    .then(function(files) {
      // Recursively examine directory's children
      var promises = []
      files.forEach(function(newFileName) {
        promises.push(createDirectoryObject(rootDir, fileName + '/' + newFileName, options))
      })

      // Wait for all children to complete before resolving main promise
      Q.all(promises).then(function(data) {
        if (options.sortType) {
          data = sortType(data)
        }

        fileInfo.edges = data
        deferred.resolve(fileInfo)
      })
    })
    .catch(function(err) {
      // Main promise should always resolve
      deferred.resolve(fileInfo)
    })

  return deferred.promise
}

module.exports = createDirectoryObject
