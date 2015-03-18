var fs = require('fs');
var system = require('system');
var urlModule = require('url');

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
        cb(page.content);
        page.close();
    };

    page.onConsoleMessage = function(msg, lineNum, sourceId) {
       console.debug('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    }; //For service purposes only

    page.onInitialized = function() {
       page.evaluate(function() {
            setTimeout(function() {
                window.callPhantom();
            }, 10000); //If no callPhantom script was called on the page, then wait 10secs and load page anyway.
        });
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
    console.info("Reading config.json");

    var content = fs.read('config.json');
    var settings = JSON.parse(content);

    var options = {}

    if (fs.exists('/etc/prerender.json')) {
        console.info("Reading /etc/prerender.json");
        var content = fs.read('/etc/prerender.json');
        var options = JSON.parse(content);
    }
    settings = mergeOptions(settings, options);

    if (fs.exists('config-local.json')) {
        console.info("Reading config-local.json");
        var content = fs.read('config-local.json');
        var options = JSON.parse(content);
    }
    settings = mergeOptions(settings, options);

    return settings;
}

var mergeOptions = function(obj1, obj2) {

    var clone = JSON.parse(JSON.stringify(obj1));

    for (var p in obj2) {
        try {
          // Property in destination object set; update its value.
          if ( obj2[p].constructor==Object ) {
            clone[p] = MergeRecursive(clone[p], obj2[p]);

          } else {
            clone[p] = obj2[p];

          }

        } catch(e) {
          // Property in destination object not set; create it and set its value.
          clone[p] = obj2[p];

        }
    }

    return clone;
}

//------------------------------------------

if (!checkVersion(1, 9, 8)) {
    console.error("Minimum required phantom version is 1.9.8")
    phantom.exit();
}

var config = configure()

var server = require('webserver').create();
var urlPrefix = config['url'];
var port = config['port'] || system.env.PORT || 8082;
var key = config['key'];
var userAgent = config['user_agent'];

console.info('Default url    ' + urlPrefix);
console.info('Identifying as ' + userAgent);

server.listen(port, function (request, response) {
    var route = urlModule.parse(request.url).pathname;
    var url = request.headers['X-Download-From'] || urlPrefix; //Use 'Download-from' header if present, otherwise use default one


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
    }



    url = url + route; //Then add route path

    renderHtml(url, function(html) {
        console.debug("Sending prerendered html to requester")

        response.headers['User-Agent'] = userAgent;
        response.statusCode = 200;
        response.write(html);
        response.close();
    });
});

console.info('Listening on   ' + port);
console.info('Press Ctrl+C to stop.');
