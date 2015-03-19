var fs = require('fs');
var system = require('system');
var urlModule = require('url');
var extend = require('extend');
var watch = require('./watch.js');

var checkVersion = function(major, minor, patch) {
    if (phantom.version.major < major) { return false; }
    if (phantom.version.major == major
        && phantom.version.minor < minor) { return false; }
    if (phantom.version.major == major
        && phantom.version.minor == minor
        && phantom.version.patch < patch) { return false; }

    return true;
}

var renderHtml = function(url, cb) {
    console.debug('Requested ' + url);

    var page = require('webpage').create();

    page.settings.loadImages = false; //Browser will load images by itself so there is no need for phantom to load them
    page.settings.localToRemoteUrlAccessEnabled = true;
    page.settings.userAgent = userAgent;

    page.onCallback = function() {
        //Javascript is removed so it won't affect the page after loading
        //Comment that part if you don't want JS scripts to be removed from the page
        page.evaluate(function() {
          var scripts;
          scripts = document.body.getElementsByTagName("script");
          while (scripts.length) {
            scripts[0].parentNode.removeChild(scripts[0])
          };
        });
        //End
        console.debug("Removed all scripts, calling callback with page-content");
        cb(page.content);
        page.close();
    };

    page.onConsoleMessage = function(msg, lineNum, sourceId) {
       console.debug('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    }; //For service purposes only

    page.onInitialized = function() {
       watch.angular(page); //Remove that if you're not using angular

       //Insert your own custom watchers here if you are using other JS frameworks

       watch.timeout(page);
    };

    console.debug("Opening page");
    page.open(url);

    page.onError = function (msg, trace) {
        console.error(msg);
        trace.forEach(function(item) {
            console.error('  ', item.file, ':', item.line);
        });
    };
};

var configure = function() {

    function loadConfig(filename, settings, failIfNotExists) {
        failIfNotExists = (typeof failIfNotExists === 'undefined') ? false : failIfNotExists;
        if (fs.exists(filename)) {
            console.info("Reading " + filename);
            var content = fs.read(filename);
            var options = JSON.parse(content);
            return extend(true, settings, options);
        } else {
            if (failIfNotExists) {
                console.error("Could not load from " + filename);
                phantom.exit(1);
            } else {
                console.info("Skipping " + filename + ": file not found.");
            }
        }
    }

    var settings = {}
    loadConfig('config.json', settings, true)
    loadConfig('/etc/prerender.json', settings)
    loadConfig('config-local.json', settings)

    return settings;
}

//------------------------------------------

if (!checkVersion(1, 9, 8)) {
    console.error("Minimum required phantom version is 1.9.8")
    phantom.exit();
}

var config = configure()

var server = require('webserver').create();
var urlPrefix = config['url'];
var port = system.env.PORT || config['port'] || 8082;
var key =  system.env.KEY || config['key'];
var userAgent = config['user_agent'];

console.info('Default url    ' + urlPrefix);
console.info('Identifying as ' + userAgent);

server.listen(port, function (request, response) {
    var route = urlModule.parse(request.url).pathname;
    var base = request.headers['X-Download-From'] || urlPrefix; //Use 'Download-from' header if present, otherwise use default one
    console.debug("Base: " + base);
    console.debug("Path: " + route);

    if (key) {
        if (!request.headers['Authorization']) {
            console.warn("Authorization needed; no Authorization headers found");
            response.statusCode = 401;
            response.write(fs.read('401.html'));
            response.close();
            return;
        } else if (request.headers['Authorization'] !== "Bearer " + key) {
            console.warn("Access denied; invalid Authorization header");
            response.headers['User-Agent'] = userAgent;
            response.statusCode = 403;
            response.write(fs.read('403.html'));
            response.close();
            return;
        }
        console.debug("Allowing access for request with correct Authorization header")
    }



    url = base + route; //Then add route path

    renderHtml(url, function(html) {
        console.debug("Sending prerendered html to requester")
        response.statusCode = 200;
        response.write(html);
        response.close();
    });
});

console.info('Listening on   ' + port);
console.info('Press Ctrl+C to stop.');
