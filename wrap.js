/**
 * Hi. I'm a node program that wraps PAE games.
 */
var spawn = require('child_process').spawn;
var async = require('async');
var wrench = require('wrench');
var fs = require('fs');
var nw_params = require('./nw-params.js');
var path = require('path');

var package_location;

var argv = require('optimist')
    .demand(['game','resources', 'output'])
    .default('engine', 'engine')
    .describe('game', 'Path to game JSON.')
    .describe('resources', 'Path to resource directory for games.')
    .describe('engine', 'Path to directory containing PAE.')
    .describe('output', 'Output directory. Will be created if does not exist. Anything in it that conflicts will be overwritten.')
    .argv;

/**
 * Make sure plovr exists.
 * @param {Object} callback
 */
var testPlovr = function(callback) {
    var ps = spawn('plovr', []);

    // ps.stdout.on('data', function(data) {
        // console.log('stdout: ' + data);
    // });
// 
    // ps.stderr.on('data', function(data) {
        // console.log('stderr: ' + data);
    // });

    ps.on('close', function(code) {
        if (code == 127) 
            return callback("Hmm, plovr doesn't appear to be installed. Try npm install -g plovr. Alternately install it however you like and put it in your PATH.")
        callback && callback();
    });
}

/**
 * Compile PAE.
 * @param {Object} callback
 */
var getEngine = function(callback) {
    console.log("Compiling PAE.")
    var jsonFile = argv.engine + '/plovr-release.json';
    var ps = spawn('plovr', ['build',jsonFile]);
    var errorText = "";
    var outText = "";
    ps.stdout.on('data', function(data) {
        outText += data;
    });
    ps.stderr.on('data', function(data) {
        errorText += data;
    });
    ps.on('close', function(code) {
        if (code != 0) {
            callback("plovr error. Error: " + errorText);
        }
        callback(null, outText);
    });
}

/**
 * Get the wrappers we'll use.
 * @param {Object} callback
 */
var mkdirs = function(callback) {
    try {
        wrench.mkdirSyncRecursive(argv.output, 0777);
        wrench.mkdirSyncRecursive(argv.output + "/nw-package", 0777);
        wrench.copyDirSyncRecursive("nw-contents", argv.output + '/nw-package');
    }
    catch(e) {
        callback(e);
    }
    try {
        wrench.copyDirSyncRecursive(argv.resources, argv.output + '/nw-package/resources');
    }
    catch(e) {
        callback('Error copying resources. Check your resource dir. Internal error: "' + e + '"');
    }
    callback(null);
}

/**
 * Get the game object. We need its name and such. 
 */
var writePackage = function(callback, results) {
    var data = results.gameJSON;
    var parsed;
    try {
        parsed = JSON.parse(data);
    }
    catch(e) {
        callback("Error parsing game: " + e);
    }
    var pack = nw_params;
    pack.description = parsed.name;
    pack.name = parsed.shortName || pack.description;
    pack.version = parsed.version || "0.0.1";
    pack.window.title = parsed.name;
    var str = JSON.stringify(pack);
    fs.writeFile(argv.output + '/nw-package/package.json', str, callback)
}

/**
 * Zip up the .nw package.
 */
var createPackage = function(callback, results) {
    var fileName = nw_params.name + '.nw';
    var fullPath = path.resolve(argv.output) + '/' + fileName;
    package_location = fullPath;
    var workingPath = path.resolve(argv.output) + '/nw-package';
    console.log("Creating %s.", fullPath);
    var ps = spawn('zip', ['-r',fullPath,'.', '-i', '*'], {cwd: workingPath});
    var errorText = "";
    ps.stderr.on('data', function(data) {
        errorText += data;
    });
    ps.stdout.on('data', function(data) {
        errorText += data;
    });
    ps.on('close', function(code) {
        if (code != 0) {
            callback("zip error. Error: " + errorText);
        }
        console.log("Success!");
        callback(null);
    });
}

/**
 * Get the names of wrappers.
 */
var runWrappers = function(callback) {
    var wrappers = fs.readdirSync('wraps');
    async.forEach(wrappers, function(wrapName, callback) {
        console.log('Wrapping for platform "%s".', wrapName);
        try {
            var wrap = require('./wraps/' + wrapName);
            wrap.wrapItUp({
                wrapName: wrapName,
                gameInfo: nw_params,
                output: path.resolve(argv.output),
                package: package_location
            }, callback)
        }
        catch(e) {
            console.log('Error wrapping for platform %s: "%s"', wrapName, e);
            console.log('Continuing onto next platform.');
        }
    }, callback)
}

/**
 * Let's do it.
 */
async.auto({
    testPlovr: testPlovr,
    engine: ['testPlovr', getEngine],
    mkdirs: ['testPlovr', mkdirs],
    gameJSON: ['testPlovr', 'mkdirs', function(callback) { fs.readFile(argv.game, {encoding: 'utf8'}, callback); }],
    writePackage : ['gameJSON', writePackage],
    writeGame: ['gameJSON', function(callback, results) { fs.writeFile(argv.output + '/nw-package/game.json', results.gameJSON, callback) }],
    writeEngine: ['engine', function(callback, results) { fs.writeFile(argv.output + '/nw-package/PAE.js', results.engine, callback) }],
    createPackage: ['writePackage', 'writeGame', 'writeEngine', createPackage],
    runWrappers: ['createPackage', runWrappers]
}, function(error, res) {
    if (error) {
        console.log(error);
        process.exit(1);
    }
    console.log("Done.");
    process.exit(0);
})
