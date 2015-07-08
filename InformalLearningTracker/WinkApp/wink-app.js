"use strict";

(function (WinkApp) {
	WinkApp.conf = {
		endpoint: "https://cloud.scorm.com/tc/yoururl/",
		auth: "Basic " + toBase64("youremail@yahoo.com:yourpassword"),
		debug: false,
		allowFail: false
	};

	WinkApp.verbs = {
		"bookmarked": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=bookmark",
			"display": {
				"en-US": "bookmarked"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": true,
				"documents": true,
				"video": true
			}*/
		},
		"shared": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=share",
			"display": {
				"en-US": "shared"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": true,
				"documents": true,
				"video": true
			}*/
		},
		"viewed": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=view",
			"display": {
				"en-US": "viewed"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": false,
				"documents": true,
				"video": true
			}*/
		},
		"created": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=create",
			"display": {
				"en-US": "created"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": true,
				"documents": true,
				"video": false
			}*/
		},
		"edited": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=edit",
			"display": {
				"en-US": "edited"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": true,
				"documents": true,
				"video": false
			}*/
		},
		"asked": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=ask",
			"display": {
				"en-US": "asked"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": false,
				"documents": false,
				"video": false
			}*/
		},
		"commented": {
			"id": "http://adlnet.gov/expapi/verbs/commented",
			"display": {
				"en-US": "commented"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": false,
				"documents": false,
				"video": true
			}*/
		},
		"replied": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=replied",
			"display": {
				"en-US": "replied"
			}
		},
		"experienced": {
			"id": "http://adlnet.gov/expapi/verbs/experienced",
			"display": {
				"en-US": "experienced"
			}
		},
		"deleted": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=deleted",
			"display": {
				"en-US": "deleted"
			}
		},
		"posted": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=posted",
			"display": {
				"en-US": "posted"
			}
		},
		"launched" : {
			"id" : "http://adlnet.gov/expapi/verbs/launched",
			"display" : {"en-US" : "launched",
				"es-ES" : "lanzó"}
		},
		"responded": {
			"id": "http://adlnet.gov/expapi/verbs/responded",
			"display": {
				"en-US": "responded",
				"es-ES": "respondió"
			}
		},
	};


	WinkApp.pad = function (number) {
		var r = String(number);
		if (r.length === 1) {
			r = '0' + r;
		}
		return r;
	};

}(window.WinkApp = window.WinkApp || {}));

if (!String.prototype.trim) {
	(function () {
		// Make sure we trim BOM and NBSP
		var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
		String.prototype.trim = function () {
			return this.replace(rtrim, '');
		};
	})();
}