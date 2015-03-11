var system = require('system');
var urlModule = require('url');

if (system.args.length < 3) {
    console.log("Missing arguments.");
    phantom.exit();
}

var server = require('webserver').create();
var port = parseInt(system.args[1]);
var urlPrefix = system.args[2];

var parse_qs = function(s) {
    var queryString = {};
    var a = document.createElement("a");
    a.href = s;
    a.search.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function($0, $1, $2, $3) { queryString[$1] = $3; }
    );
    return queryString;
};

var renderHtml = function(url, cb) {
    var page = require('webpage').create();
    page.settings.loadImages = false;
    page.settings.localToRemoteUrlAccessEnabled = true;
    page.onCallback = function() {
        cb(page.content);
        page.close();
    };

    page.onConsoleMessage = function(msg, lineNum, sourceId) {
       console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    };

    page.onInitialized = function() {
       page.evaluate(function() {
            setTimeout(function() {
                window.callPhantom();
            }, 10000);
        });
    };
    page.open(url);

    page.onError = function (msg, trace) {
        console.log(msg);
        trace.forEach(function(item) {
            console.log('  ', item.file, ':', item.line);
        });
    };
};

server.listen(port, function (request, response) {
    var route = urlModule.parse(request.url).pathname;
    var url = urlPrefix + route;
    renderHtml(url, function(html) {
        response.statusCode = 200;
        response.write(html);
        response.close();
    });
});

console.log('Listening on ' + port + '...');
console.log('Press Ctrl+C to stop.');
