# DEPRECATED IN FAVOR OF [GOABOUT/PRERENDER](https://github.com/goabout/prerender)
# PLEASE, DO NOT USE THIS REPO

# What it is


It is a pre-rendering server based on PhantomJS. It loads JS based app
remotely and sends already processed page with JS cut out.

The idea is based on [angular-seo](https://github.com/steeve/angular-seo)
But the actual code was changed to fit our GoAbout app. However,
the renderer is app-agnostic and it can be used with any JS-based app,
not only ours. You just need to install it on your own machine.


## How to use with AngularJS (or any other framework)

The solution is made of 4 parts:

1. small modification of your static HTML file [optional]
2. an AngularJS module, that you have to include and call
3. PhantomJS script
4. redirect request from bots to PhantomJS

### 1. Modifying your static HTML

Just add this to your `<head>` to enable AJAX indexing by the crawlers.

	<meta name="fragment" content="!" />

I'm assuming there that you use HTML5 mode on your app. Otherwise check
[Angular-seo](https://github.com/steeve/angular-seo).

More information about the [`#!` notation in URL's](https://support.google.com/webmasters/answer/174992?hl=en).

### 2. AngularJS Module

That app will automatically inject code to call phantom when angular has finished all his async requests.

If Phantom was not called with angular-dependent script, the page will be rendered with 10
seconds delay.

### 3. PhantomJS Module

For the app to be properly rendered, you will need to run the
`server.js` with PhantomJS. Make sure to disable caching:

	$ phantomjs --disk-cache=no server.js


By default this runs a prerender machine at localhost:8082 and will grab pages from goabout.com

The script loads the following three files, in order, to get settings
from

1. ./config.json
2. ./config-local.json
3. All the possible env variables

The file `config.json` is included in the git-repo and should not change
other than to change/add new default values.

See settings section below.


### 4. Redirecting


Of course you don't want regular users to see this, only crawlers. To
detect that, just look for an `_escaped_fragment_` in the query args.
And or check the User-Agent headers. We'll also make sure that if our
PhantomJS browser requests the page, we'll _never_ prerender again, to
prevent never-ending loops.

#### For instance with Nginx:


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
		proxy_set_header Authorization    Bearer some-predifined-key
		if ($prerender) {
				# Only proyx if $prerender is not set to 0.
			proxy_pass  http://localhost:8082/$uri?$args;
		}
	}



## Check your setup

Make a get request to the server with path which is the same as actual
path and with header `X-Download-From` containing actual host address.

For example, this request (running PhantomJS locally on port 8082):

	curl -H 'X-Download-From: https://goabout.com' 'http://localhost:8082/pages/premium-index/mywheels'

Will render page at `https://goabout.com/pages/premium-index/mywheels`

If there is no `X-Download-From` then the app will use default host
defined in `Procfile` (`goabout.com` in our case)

If you have set a (secret) value for `key`, then the request must be as
follows:

	curl -H 'Authorization: Bearer <secret-value>' -H 'X-Download-From: https://goabout.com' 'http://localhost:8082/pages/premium-index/mywheels'


## Create a pre-render machine

An easy way would be to make a machine at Heroku.com with PhantomJS
buildpack(https://github.com/stomita/heroku-buildpack-phantomjs) Just
create a machine and push code there without any changes.

### On Heroku

1. [Get a Heroku account](https://devcenter.heroku.com/articles/quickstart) and install their [awesome toolbelt](https://toolbelt.heroku.com)
2. Clone this repo and push it up to an Heroku instance or (Or use their dashboard to make an app, fork it and connect it to your fork in heroku dashboard)

```
git clone git@github.com:goabout/spreadsheets-cacher.git
cd spreadsheets-cacher
heroku create
git push heroku master
```

3. Set up env variables with `config:set` (see that [guide](https://devcenter.heroku.com/articles/nodejs-support#customizing-the-build-process))

### On docker
1. Make sure you're familiar with [Docker](https://www.docker.com/) and it is installed on your machine
```
docker build .
docker run -p <your_preferred_port>:80 -d <id>
```
(Don't forget to pass ENV variables as well)


## Settings

* key [not set by default]

	A secret. If set any system that wants to access this prerender setup,
	_must_ provide an Authorization: Bearer <key> header. Obviously this
	is only safe if used over http*s*.

* url [default "https://goabout.com"]

	The default url(-prefix) used to make requests to. Used if X-Download-
	For header is not set with the request.

* port [default 8082]

	The port to listen on. Note that for any port < 1024 you need some
	kind of root/administrator rights.

* user_agent [default "GoAbout/Prerenderer"]

	Used to set the User-Agent header on outgoing requests, used to
	identify itself to the target machine (= machine at url or X-Download-
	From). Don't forget to reflect this setting in your NginX/Apache setup
	to disable pre-rendering if a request is made with this User-Agent...


