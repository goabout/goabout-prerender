//Will call phantom as soon as angular has finished all the requests
exports.angular = function(page) {
	page.evaluate(function() {
		var TriedAlready = 0;
		(function tryForAngular() {
			setTimeout(function() {
				if (window.angular) {
					var el = document.querySelector('html');

					try {
						if (angular.getTestability) {
							angular.getTestability(el).whenStable(function() {
								window.callPhantom();
								console.debug("Angular is Ready! Calling phantom!");    
							});
						} else {
							if (!angular.element(el).injector()) {
								throw new Error('root element body) has no injector.' +
									 ' this may mean it is not inside ng-app.');
							}
							angular.element(el).injector().get('$browser').
								notifyWhenNoOutstandingRequests(function() {
									window.callPhantom();
									console.debug("Angular is Ready! Calling phantom!");
								});
						}
					} catch (err) {
					 throw new Error('waitForAngular failed!');
					}
				} else {
					TriedAlready++;
					//Try to look for angular 30*100ms            
					if (TriedAlready < 30) {
						tryForAngular();            
					}
				}
			}, 100)
		})()
	})
}

//Will call phantom in n seconds
//Handy fallback when all the other watch scripts failed
exports.timeout = function(page) {
	page.evaluate(function() {
		setTimeout(function() {
			console.debug("setTimeout() rang, calling callPhantom()");
			window.callPhantom();
		}, 10000);
	});
}
