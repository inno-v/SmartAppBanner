/**
* iOS Smart App Banner replacement with web technologies
*
* @version 1.0
* @based https://github.com/ijason/Smart-App-Banners/blob/master/js/smart-app-banner.js
* @reference https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/PromotingAppswithAppBanners/PromotingAppswithAppBanners.html#//apple_ref/doc/uid/TP40002051-CH6-SW1
* @api http://www.apple.com/itunes/affiliates/resources/documentation/itunes-store-web-service-search-api.html#searchexamples
*/


(function() {
	/**
	* Vanilla XMLHttpRequest wrapper
	*
	* @param Object config
		* @param String data
		* @param String url
		* @param Function success
		* @param Function error
	*/
	var http = function(config) {
		var req = new XMLHttpRequest();
		var method = (config.data) ? "POST" : "GET";

		req.open(method, config.url, true);
		req.setRequestHeader('User-Agent','XMLHTTP/1.0');

		if (config.data) {
			req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
		}

		req.onreadystatechange = function () {
			if (req.readyState != 4) return;
			if (req.status != 200 && req.status != 304) {
				if ( typeof config.error != "function" ) {
					console.log(req.status+": "+ req.response);
				} else {
					config.error(req.status, req.response);
				}
				return;
			}
			config.success(req.response)
		};

		if (req.readyState == 4) return;
		req.send(config.data);
	};

	/**
	* Load JSONP utility
	*
	* @source https://gist.github.com/132080/110d1b68d7328d7bfe7e36617f7df85679a08968
	* @param String url
	* @param Function callback
	* @param Object context
	*/

	var loadJSONP = (function() {
		var unique = 0;
		return function(url, callback, context) {
			// INIT
			var name = "_jsonp_" + unique++;
			if (url.match(/\?/)) url += "&callback="+name;
				else url += "?callback="+name;
			// Create script
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = url;
			// Setup handler
			window[name] = function(data){
				callback.call((context || window), data);
				document.getElementsByTagName('head')[0].removeChild(script);
				script = null;
				delete window[name];
			};
			// Load JSON
			document.getElementsByTagName('head')[0].appendChild(script);
		};
	})();

	SmartAppBanner = (function() {
		var LOCALE = 'ES';
		var API_URL = 'http://itunes.apple.com/lookup?country='+LOCALE+'&id=';
		var TEMPLATE_NODE = '[data-template=smartapp-banner]';
		var TEMPLATE_DIR = '/static/modules/smartapp-banner/';
		return {
			/**
			* Obtains appID and extra config for setup
			*
			* @param Integer appID
			* @return Object
				* @prop String appID
				* @prop String appArgs
			*/
			getConfig: function() {
				var metatag = document.querySelector('meta[name=apple-itunes-app]');
				if (metatag) {
					var content = metatag.getAttribute('content').split(',');
					for (var i in content) {
						if (content[i].search('app-id=') != -1) {
							var appID = content[i].replace('app-id=', '');
						} else if (content[i].search('app-argument=') != -1) {
							var appArgs = content[i].replace('app-argument=','');
						}
					}
					return {
						appID: appID,
						appArgs: appArgs
					}
				}

			},
			/**
			* Retrieves app metadata from Apple servers with a given appID
			*
			* @param String || Integer appID
			* @return Object
			*/
			getData: function(appID, callback) {
				loadJSONP(API_URL+appID,
					 function(data) {
					 	if (typeof callback == 'function') {
							callback(data)
					 	}
					}
				);
			},
			/**
			* Generates template from Apple's parsed metadata
			*
			* @param Object metadata
			* @return String
			*/
			parseData: function(metadata, template) {
				var info = {
					icon: metadata.artworkUrl100,
					name: metadata.trackName,
					price: metadata.formattedPrice,
					averageUserRating: parseInt(metadata.averageUserRating),
					userRatingCount: metadata.userRatingCount,
					buyUrl: metadata.trackViewUrl,
					openUrl: metadata.openUrl,
					viewString: metadata.viewString,
					openString: metadata.openString,
					appStoreString: metadata.appStoreString
				}

				for ( var i in info ) {
					var key = i;
					var value = (typeof info[i] == 'undefined') ? '' : info[i];
					var template = template.replace(new RegExp('{_'+key+'_}', 'g'), value);
				}
				return template;
			},
			/**
			* Initializes Smart App Banner
			*
			*/
			init: function() {
				var config = this.getConfig();
				var context = this;

				// Request info from Apple
				this.getData(config.appID, function(response) {
					// Add extra data
					var info = response.results[0];
					info.openUrl = config.appArgs;
					info.appStoreString = 'On the App Store';
					info.viewString = 'view';
					info.openString = 'open';

					var localTemplate = document.querySelector(TEMPLATE_NODE);
					if (localTemplate) {
						// Use template from page
						document.body.insertAdjacentHTML('afterbegin', localTemplate);
					} else {
						// Load template from dir
						http({
							url: TEMPLATE_DIR+'template.html',
							success: function(tpl) {
								// Parse data and append element
								var banner = context.parseData(info, tpl);
								document.body.insertAdjacentHTML('afterbegin', banner);
							}
						});
					}
				});
			}
		}
	})();
	SmartAppBanner.init();
})();