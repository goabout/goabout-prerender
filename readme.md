==========
What it is
==========

It is a prerendering server based on PhantomJS. It loads JS based app
remotely and sends already processed page with JS cut out.

The idea is based on [angular-seo](https://github.com/steeve/angular-
seo) But the actual code was changed to fit our GoAbout app. However,
the renderer is app-agnostic and it can be used with any JS-based app,
not only ours. You just need to install it on your own machine.


How to use with AngularJS (or any other framework)
==================================================

The solution is made of 4 parts:

1. small modification of your static HTML file [optional]
2. an AngularJS module, that you have to include and call
3. PhantomJS script
4. redirect request from bots to PhantomJS

1. Modifying your static HTML
-----------------------------

The `#!` escape for browsers that use HTML5 push-state makes crawlers
request your page as
`http://your.site/page?_escape_fragment_=some/push/state/url. If you
don't use the `#!` escape, but do want crawlers to use an
`_escape_fragment_` request, you can add a meta-tag, that will indicate
that you want this to happen.

Just add this to your `<head>` to enable AJAX indexing by the crawlers.
```
<meta name="fragment" content="!" />
```

I'm assuming there that you use HTML5 mode on your app. Otherwise check
[Angular-seo](https://github.com/steeve/angular-seo).

2. AngularJS Module
-------------------

Check `seo.service.js.example` for an example setup for angularJS. The
idea is to trigger phantomJS by calling `window.callPhantom()` when JS
content is ready.

If Phantom was not called at all, the page will be rendered with 10
seconds delay.

3. PhantomJS Module
-------------------

For the app to be properly rendered, you will need to run the `angular-
seo-server.js` with PhantomJS. Make sure to disable caching:

```
$ phantomjs --disk-cache=no angular-seo-server.js [port] [URL prefix]
```

`URL prefix` is the URL that will be prepended to the path the crawlers
will try to get.

Example:

```
$ phantomjs --disk-cache=no server.js http://goabout.com 8082
```

Will run prerender machine at localhost:8082 and will grab pages from
goabout.com

4. Redirecting
--------------

Of course you don't want regular users to see this, only crawlers. To
detect that, just look for an `_escaped_fragment_` in the query args.
And or check the User-Agent headers. We'll also make sure that if our
PhantomJS browser requests the page, we'll _never_ prerender again, to
prevent never-ending loops.

For instance with Nginx:
~~~~~~~~~~~~~~~~~~~~~~~~

```
	# Don't prerender by default
	set $prerender 0;
	if ($http_user_agent ~* "Googlebot|bing|baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator") {
		# If it is a known bot, lets pre-render
		set $prerender 1;
	}
	if ($args ~ "_escaped_fragment_") {
		# If the request is made with an _escaped_fragemt_, lets pre-render.
		set $prerender 1;
	}
	if ($http_user_agent ~ "GoAbout/Prerenderer") {
		# Never prerender if request is made by our own Pre-renderer.
		set $prerender 0;
	}
	if ($uri ~* ".txt|.ico|.js|.css|.png|.jpg|scripts/|img/|styles/|fonts/") {
		# Never pre-render for static files or other locations that don't need it.
		set $prerender 0;
	}

	location / {
		# For debugging purposes. Very handy to see if the page was pre-rendered.
		add_header X-Was-Prerendered $prerender;

		# To let our renderer know what domain to use.
		proxy_set_header X-Download-From  https://goabout.com/
		if ($prerender) {
		    # Only proyx if $prerender is not set to 0.
			proxy_pass  http://localhost:8082/$uri?$args;
		}
	}
```


Check your setup
================

Make a get request to the server with path which is the same as actual
path and with header `X-Download-From` containing actual host address.

For example, that request: `http://localhost:8082/pages/premium-
index/mywheels` with `X-Download-From: https://goabout.com` Will render
page at https://goabout.com/pages/premium-index/mywheels


If there is no `X-Download-From` then the app will use default host
defined in `Procfile` (GoAbout.com in our case)

Create a pre-render machine
===========================

An easy way would be to make a machine at Heroku.com with PhantomJS
buildpack(https://github.com/stomita/heroku-buildpack-phantomjs) Just
create a machine and push code there without any changes.

You should make sure that only specific sources can access this machine.
Easiest way to protect your PhantomJS is to install it on the same
machine and only allow local connections to it in your firewall.

Otherwise you could setup node.js and PhantomJS on your own server and
set the proxy_pass rule to that machine.

