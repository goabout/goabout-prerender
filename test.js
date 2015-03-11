var http = require('http');
var system = require('system');
var port = parseInt(system.args[1]);
var url = require('url');


http.createServer(function (request, response) {
	console.log(url.parse(request.url).pathname);
	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.end('Hello World\n');
}).listen(8124);
