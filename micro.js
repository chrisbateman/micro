var micro = {};


micro.dom = {
	
	/**
	* Determines whether a DOM element has the given className.
	* 
	* @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	* @param {HTMLElement} node The DOM element. 
	* @param {String} className The class name to search for
	* @return {Boolean} Whether or not the element has the given class. 
	*/
	hasClass: function(node, className) {
		var re = new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)');
		return re.test(node.className);
	},
	
	/**
	 * Adds a class name to a given DOM element.
	 * 
	 * @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	 * @param {HTMLElement} node The DOM element. 
	 * @param {String} className The class name to add to the class attribute
	 */
	addClass: function(node, className) {
		if (!this.hasClass(node, className)) { // skip if already present 
			node.className = micro.util.trim([node.className, className].join(' '));
		}
	},
	
	/**
	 * Removes a class name from a given element.
	 * 
	 * @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	 * @param {HTMLElement} node The DOM element. 
	 * @param {String} className The class name to remove from the class attribute
	 */
	removeClass: function(node, className) {
		if (className && this.hasClass(node, className)) {
			node.className = micro.util.trim(node.className.replace(new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)'), ' '));
			
			if (this.hasClass(node, className) ) { // in case of multiple adjacent
				this.removeClass(node, className);
			}
		}
	},
	
	/**
	* If the className exists on the node it is removed, if it doesn't exist it is added.
	* 
	* @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	* @param {HTMLElement} node The DOM element
	* @param {String} className The class name to be toggled
	* @param {Boolean} addClass Optional boolean to indicate whether class should be added or removed regardless of current state
	*/
	toggleClass: function(node, className, force) {
		var add = (force !== undefined) ? force : !(this.hasClass(node, className));
		
		if (add) {
			this.addClass(node, className);
		} else {
			this.removeClass(node, className);
		}
	},
	
	/**
	 * Wrapper/polyfill for querySelectorAll
	 * @see http://www.codecouch.com/2012/05/adding-document-queryselectorall-support-to-ie-7/
	 * 
	 * @param {String} selector
	 * @param {HTMLElement} [node]
	 * @return {NodeList|Array}
	 */
	qsa: function(selector1, node1) {
		if (document.querySelectorAll) {
			micro.dom.qsa = function(selector, node) {
				node = node || document;
				return node.querySelectorAll(selector);
			};
		} else {
			var style = document.createStyleSheet();
			
			micro.dom.qsa = function(selector, node) {
				node = node || document;
				var rs = [];
				var selectors = selector.replace(/\[for\b/gi, '[htmlFor').split(',');
				var all = (node === document) ? node.all : node.getElementsByTagName('*');
				
				for (var iSel=selectors.length; iSel--;) {
					style.addRule(selectors[iSel], 'foo:bar');
					for (var iAll=all.length; iAll--;) {
						if (all[iAll].currentStyle.foo) {
							rs.push(all[iAll]);
						}
					}
					style.removeRule(0);
				}
				return rs;
			};
		}
		
		return micro.dom.qsa(selector1, node1);
	},
	
	/**
	 * Wrapper/polyfill for Element.matches
	 *
	 * @param {HTMLElement}	node
	 * @param {String}		selector
	 * @return {Boolean}
	 */
	matches: function(node1, selector1) {
		var docEl = document.documentElement;
		var matchesFunc = docEl.matches || docEl.webkitMatchesSelector || docEl.mozMatchesSelector || docEl.msMatchesSelector || docEl.oMatchesSelector;
		
		if (matchesFunc) {
			micro.dom.matches = function(node, selector) {
				return matchesFunc.call(node, selector);
			};
		} else {
			micro.dom.matches = function(node, selector) {
				var selectorNodes = this.qsa(selector);
				for (var i=0, iLen=selectorNodes.length; i<iLen; i++) {
					if (selectorNodes[i] === node) {
						return true;
					}
				}
				return false;
			};
		}
		return micro.dom.matches(node1, selector1);
	}
	
};



micro.event = {
	
	/**
	 * Add an event listener
	 *
	 * @param {HTMLElement} node The node to add the listener to
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 * @return {Event} The event
	 */
	addEvent: function(node, evt, callback) {
		if (node.addEventListener) {
			return node.addEventListener(evt, callback, false);
		} else if (node.attachEvent)  {
			return node.attachEvent('on' + evt, callback);
		}
	},
	
	/**
	 * Delegated event listener
	 *
	 * @Param {String} selector
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 * @param {HTMLElement} container Node to add the listener to
	 * @return {Event} The added event
	 */
	delegate: function(selector, evt, callback, container) {
		container = container || document.body;
		
		// Change events don't bubble in ie8-
		// Add listener to every node instead (boo)
		if (evt === 'change' && !container.addEventListener) {
			var changeNodes = micro.dom.qsa(selector, container);
			for (var i=0; i<changeNodes.length; i++) {
				this.addEvent(changeNodes[i], evt, function(ev) {
					var target = ev.target || ev.srcElement;
					callback.apply(target);
				});
			}
			return true;
		}
		
		return this.addEvent(container, evt, function(ev) {
			var target = ev.target || ev.srcElement;
			if (micro.util.matches(target, selector)) {
				callback.apply(target);
			}
		});
	},
	
	/**
	 * Fires callback when the DOM is ready.
	 * Needs some work. Will run twice for ie8- under some circumstances
	 * @see https://github.com/jquery/jquery/blob/e53a91909061c7a7280a274990db179b94db81b6/speed/jquery-basis.js#L406
	 * @see https://github.com/yui/yui3/blob/0ecec8862f21ab13a61b5c1459d164a68f273de0/src/event/js/event-ready-base-ie.js
	 * 
	 * @param {function} callback
	 */
	onReady: function(callback) {
		var ieTimeout;
		
		var ready = function(ev) {
			callback();
			cleanup(ev);
		};
		
		var cleanup = function(ev) {
			if (document.addEventListener) {
				document.removeEventListener('DOMContentLoaded', ready, false);
				window.removeEventListener('load', ready, false);
			} else if (ev) { // don't run if it was the setTimeout
				window.detachEvent('onreadystatechange', ready);
				clearTimeout(ieTimeout);
			}
		};
		
		if (document.readyState === 'complete') {
			callback();
		} else if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', ready, false);
			window.addEventListener('load', ready, false); //failsafe
		} else {
			// works unless page is rendered progressively (it'll fire too soon)
			// @see http://snook.ca/archives/javascript/settimeout_solve_domcontentloaded
			ieTimeout = setTimeout(ready);
			
			document.attachEvent('onreadystatechange', function(ev) {
				if (document.readyState === 'complete') { // can't trust 'interactive'
					ready(ev);
				}
			});
		}
	}
	
};



micro.util = {
	
	/**
	 * Micro templating system.
	 * @example:
	 *   micro.util.template('Replace this {{k}}.', {k:'key'});
	 *   returns 'Replace this key.'
	 * @see https://gist.github.com/cowboy/439479
	 * @param {String} template
	 * @param {Object} data Object with keys and values
	 * @return {String} Completed string
	 */
	template: function(template, data) {
		return template.replace(/\{\{([\w]+)\}\}/ig, function(a, b) {
			return data[b] || '';
		});
	},
	
	/**
	 * Basic polyfill.
	 * 
	 * @see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	 * @param {Function} callback
	 */
	requestAnimFrame: (function() {
		return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) {
			window.setTimeout(callback, 1000/60);
		};
	})(),
	
	/**
	 * Fallback for String.trim()
	 * IE 8-
	 * @param {String} str
	 * @return {String} Trimmed string
	 */
	trim: function(str) {
		if (str.trim) {
			return str.trim();
		} else {
			return str.replace(/^\s+|\s+$/g,'');
		}
	},
	
	/**
	 * Returns the height of the window
	 *
	 * @return {Number} Height in pixels
	 */
	getWindowHeight: function() {
		return window.innerHeight || document.documentElement.offsetHeight;
	},
	
	/**
	 * Make an asynchronous request
	 *
	 * @param {Object}		cfg Configuration object
	 * @param {String}		cfg.url
	 * @param {Function}	cfg.success Called with the request's responseText.
	 * @param {Function}	[cfg.failure] 
	 * @param {String}		[cfg.method] Defaults to 'GET'
	 */
	ajax: function(cfg){
		cfg.method = cfg.method || 'GET';
		var xmlhttp;
		
		if (window.XMLHttpRequest) {
			xmlhttp = new window.XMLHttpRequest();
		} else if (window.ActiveXObject) {
			xmlhttp = new window.ActiveXObject('MSXML2.XMLHTTP.6.0');
		} else {
			if (cfg.failure) {
				cfg.failure();
			}
			return;
		}
		
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState === 4) {
				if (xmlhttp.status === 200) {
					cfg.success(xmlhttp.responseText);
				} else if (cfg.failure) {
					cfg.failure();
				}
			}
		};
		
		xmlhttp.open(cfg.method, cfg.url, true);
		xmlhttp.send();
	}
	
};

