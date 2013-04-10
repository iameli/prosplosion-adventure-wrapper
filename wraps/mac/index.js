/**
 * Hi, I'm the Mac wrapper.
 */
var MacWrapper = module.exports = {};
var path = require("path");
var wrench = require("wrench");
var fs = require('fs');

MacWrapper.wrapItUp = function(params, callback) {
    var destName = params.gameInfo.name + '.app';
    var outputDir = path.resolve(params.output, params.wrapName, destName);
    wrench.mkdirSyncRecursive(outputDir, 0755);
    wrench.copyDirSyncRecursive(path.resolve(__dirname, 'node-webkit.app'), outputDir);
    wrench.chmodSyncRecursive(outputDir, 0755);
    wrench.chmodDirSyncRecursive
    var file = fs.readFile(params.package, function(err, data) {
        if (err) return callback(err);
        fs.writeFile(path.resolve(outputDir, "Contents", "Resources", "app.nw"), data, function(err){
            if (err) return callback(err);
            callback(null);
        })
    })
}
