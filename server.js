var system = require('system');
var urlModule = require('url');

var server = require('webserver').create();
var urlPrefix = system.args[1];
var port = system.env.PORT || parseInt(system.args[2]) || 8082; //Use ENV 

var renderHtml = function(url, cb) {
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
       console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    }; //For service purposes only

    page.onInitialized = function() {
       page.evaluate(function() {
            setTimeout(function() {
                window.callPhantom();
            }, 10000); //If no callPhantom script was called on the page, then wait 10secs and load page anyway.
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
    var url = request.headers['X-Download-From'] || urlPrefix; //Use 'Download-from' header if present, otherwise use default one
    url = url + route; //Then add route path

    renderHtml(url, function(html) {
        response.headers['User-Agent'] = 'GoAbout/Prerenderer';
        response.statusCode = 200;
        response.write(html);        
        response.close();
    });
});

console.log('Listening on ' + port + '...');
console.log('Press Ctrl+C to stop.');
