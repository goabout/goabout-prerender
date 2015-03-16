What is it
===========

It is a prerendering server based on PhantomJS. It loads JS based app remotely and sends already processed page with JS cut out.

The idea is based on [angular-seo](https://github.com/steeve/angular-seo)
But the actual code was changed to fit our GoAbout app. However, the renderer is app-agnostic adn it can be used with any JS-based app, not only ours. You just need to install it on your own machine.


How to use with AngularJS (or any other framework)
=======
The solution is made of 3 parts:
- small modification of your static HTML file
- an AngularJS module, that you have to include and call
- PhantomJS script

Modifying your static HTML
==========================

Just add this to your `<head>` to enable AJAX indexing by the crawlers.
```
<meta name="fragment" content="!" />
```
I'm assuming there that you use HTML5 mode on your app. Otherwise check [Angular-seo](https://github.com/steeve/angular-seo).

AngularJS Module
================

Check `seo.service.js.example` for an example setup for angularJS. The idea is to trigger phantomJS by calling `window.callPhantom()` when JS content is ready.

If Phantom was not called at all, the page will be rendered with 10 seconds delay.

PhantomJS Module
================

For the app to be properly rendered, you will need to run the `angular-seo-server.js` with PhantomJS.
Make sure to disable caching:
```
$ phantomjs --disk-cache=no angular-seo-server.js [port] [URL prefix]
```

`URL prefix` is the URL that will be prepended to the path the crawlers will try to get.

Example:
```
$ phantomjs --disk-cache=no server.js http://goabout.com 8082
```
Will run prerender machine at localhost:8082 and will grab pages from goabout.com

How to check already created machine
==========

Make a get request to the server with path which is the same as actual path and with header `X-Download-From` containing actual host address.

For example, that request:
`https://<phantomJS-Machine>/pages/premium-index/mywheels` with `X-Download-From: https://goabout.com`
Will render page at https://goabout.com/pages/premium-index/mywheels


If there is no `X-Download-From` then the app will use default host defined in `Procfile` (GoAbout.com in our case)

How to make a machine
========

The easiest way would be to make a machine at Heroku.com with PhantomJS buildpack(https://github.com/stomita/heroku-buildpack-phantomjs)
Just create a machine and push code there without any changes.

Running in behind Nginx (or other)
==================================

Of course you don't want regular users to see this, only crawlers.
To detect that, just look for an `_escaped_fragment_` in the query args.

For instance with Nginx:
```
set $prerender 0;
if ($http_user_agent ~* "Googlebot|bing|baiduspider|twitterbot|facebookexternalhit|ro$
		set $prerender 1;
}
if ($args ~ "_escaped_fragment_") {
	 set $prerender 1;
}
if ($http_user_agent ~ "GoAbout/Prerenderer") {
	 set $prerender 0;
}
if ($uri ~* ".txt|.ico|.js|.css|.png|.jpg|scripts/|img/|styles/|fonts/") {
		set $prerender 0;
}

#Some of your custom nginx rules

location / {
		add_header X-Was-Prerendered $prerender;

		proxy_set_header X-Download-From  https://goabout.com/
		if ($prerender) {
				proxy_pass  https://<phantomJS-Machine>/$uri?$args;
		}
}
```
