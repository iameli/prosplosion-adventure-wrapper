/**
 * Hi. I'm the windows wrapper.
 */
var WindowsWrapper = module.exports = {};

var async = require('async');
var fs = require('fs');
var path = require('path');
var wrench = require('wrench');

/**
 * Makes a windows executable for our game.
 * @param {Object} params
 * @param {Object} callback
 */
WindowsWrapper.wrapItUp = function(params, callback) {
    var outputName = params.gameInfo.name + '.exe';
    var outputDir  = path.resolve(params.output, params.wrapName);
    wrench.mkdirSyncRecursive(outputDir, 0777);
    wrench.copyDirSyncRecursive(path.resolve(__dirname, 'libs'), outputDir);
    var outputPath = path.resolve(outputDir, outputName);
    console.log("Windows wrapper generating %s", outputName);
    var exeStream = fs.createReadStream(path.resolve(__dirname, 'nw.exe'));
    var writeStream = fs.createWriteStream(outputPath);
    var writeError = function(err) {
        console.log("Stream error ", err);
        callback(err);
    }
    exeStream.on('error', writeError);
    writeStream.on('error', writeError);
    exeStream.pipe(writeStream, {end: false});
    exeStream.on('end', function() {
        var packStream = fs.createReadStream(params.package);
        packStream.on('error', writeError);
        packStream.pipe(writeStream);
        packStream.on('end', function() {
            callback(null);
        })
    });
}
