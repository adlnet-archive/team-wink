"use strict";

var WinkApp = WinkApp || {};
WinkApp.timeout = null;
WinkApp.timer = null;


$(document).ready(function () {
	var conf = {
		"endpoint": "https://cloud.scorm.com/tc/yoururl/",
		"auth": "Basic " + toBase64("youremail@yahoo.com:yourpassword"),
		"debug": false
	};

	/*
	 * ,
		"user": "youremail@yahoo.com",
		"password": "yourpassword",
	 */
	WinkApp.capture({ conf: conf });
});


WinkApp.capture = (function ($) {
	return (
		function (params) {
			var settings = $.extend({
				conf: {
					endpoint: "",
					auth: "",
					debug: true
				},
				messageTimeout: 6000
			}, params),
				spContext = SP.ClientContext.get_current(),
				spCurrentUser = spContext.get_web().get_currentUser(),
				wrapper = ADL.XAPIWrapper,
				$winkMsg = $("#winkCaptureStatus"),
				asynOnError = function (sender, args) {
					alert("Failed to get user name. Error:" + args.get_message());
				},
				getCurrentUserSuccess = function () {
					var user = {
						email: getUserEmail(spCurrentUser),
						name: getUserName(spCurrentUser)
					};
					setProgress("User info loaded succesfully");
				},
				getUserName = function (spUser) {
					return spUser.get_title();
				},
				getUserEmail = function (spUser) {
					if (spUser.get_email() === undefined || spUser.get_email() === "") {
						var nameArr = spUser.get_loginName().split("|");

						for (var i = 0; i < nameArr.length; i++) {
							if (nameArr[i].indexOf("@") >= 0)
								return nameArr[i];
						}
					}

					return spUser.get_email();
				},
				loadCurrentUser = function () {
					spContext.load(spCurrentUser);
					spContext.executeQueryAsync(getCurrentUserSuccess, asynOnError);
				},
				getActor = function () {
					var actor = {
						mbox: "mailto:" + getUserEmail(spCurrentUser),
						name: getUserName(spCurrentUser),
						objectType: "Agent"
					};
					return actor;
				},
				getXapiObject = function (objectName, objectUri) {
					var obj = {
						definition: {
							name: {
								"en-US": (objectName !== undefined)? objectName: document.title.toString()
							}
						},
						id: "",
						objectType: "Activity"
					};
					if (objectUri === undefined)
						obj.id = window.location.href.toString();
					else if (objectUri.substring(0, 1) == "/")
						obj.id = window.location.protocol.toString() + "://" + window.location.hostname.toString() + objectUri;
					else
						obj.id = objectUri;

					obj.id = encodeURI(obj.id);
					return obj;
				},
				setProgress = function (msg) {
					clearTimeout(WinkApp.timeout);
					$winkMsg.text(msg).show();
					WinkApp.timer = setInterval(function () {
						$winkMsg.text($winkMsg.text() + ". ");
					}, 500);
				},
				postStatement = function (verb, objectName, objectUri, redirect) {
					var xstmt = {
						id: ADL.ruuid(),
						actor: getActor(),
						verb: WinkApp.verbs[verb],
						object: getXapiObject(objectName, objectUri),
					};

					var resp_obj = wrapper.sendStatement(xstmt);
					//$winkMsg.text("Statement saved! Redirect now").show();
					
					/*
					WinkApp.timeout = setTimeout(function () {
						$winkMsg.slideUp();
					}, settings.messageTimeout);
					*/
					/*
					, function (resp, obj) {
						if (redirect)
							window.location.assign(objectUri);
						else {
							clearInterval(WinkApp.timer);
							clearTimeout(WinkApp.timeout);

							$winkMsg.text("Statement saved! Redirect now").show();
							WinkApp.timeout = setTimeout(function () {
								$winkMsg.slideUp();
							}, settings.messageTimeout);

							// update the status in the HTML
							if (obj.id !== undefined) {
								wrapper.getStatements({ "statementId": obj.id }, null, function (resp, obj) {
									if (obj.id !== undefined) {

									}
								});
							}
						}
					});
					*/
				};


			function initCapture() {

				//new forum post
				$('[id^="forum"][id$="NewPostLink"]').on("click", function () {
					var $this = $(this),
						objectName = $this.parents(".ms-webpartzone-cell").find(".js-webpart-titleCell").attr("title"),
						objectUri = $this.attr("href");

					postStatement("created", objectName, objectUri, true);

					//return false;
				});

				//view forum post
				$(".ms-comm-postListItem .ms-comm-postSubjectColumn a").on("click", function () {
					var $this = $(this),
						objectName = $this.find("span").text(),
						objectUri = $this.attr("href");

					postStatement("viewed", objectName, objectUri, true);

				});

				//view a document
				/*
				$("[summary='Documents'].ms-listviewtable .ms-listlink").on("click", function (evt) {
					var $this = $(this),
						objectName = $this.text(),
						objectUri = $this.attr("href");

					setProgress("Attempting to save statement");
					postStatement("viewed", objectName, objectUri);
					evt.preventDefault();
					evt.stopImmediatePropagation();
					evt.stopPropagation();
					//return false;

				});
				*/

				$(".mediaPlayerContainer .mediaPlayerInitialPlayButton a[title='Play']").on("click", function () {
					var $this = $(this),
						$videoContainer = $this.parents(".mediaPlayerContainer"),
						objectName = $videoContainer.parents(".ms-webpartzone-cell").find(".ms-webpart-titleText span:eq(0)").text(),
						objectUri = $videoContainer.find("video source").attr("src");

					postStatement("launched", objectName, objectUri);

				});
			}// end initCapture()

			return initCapture();
		}//end function (params)
	); //end return
})(jQuery);


(function (WinkApp) {
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
			}/*,
			"contexts": {
				"forum": true,
				"wiki": false,
				"documents": false,
				"video": false
			}*/
		},
		"experienced": {
			"id": "http://adlnet.gov/expapi/verbs/experienced",
			"display": {
				"en-US": "experienced"
			}/*,
			"contexts": {
				"forum": true,
				"wiki": false,
				"documents": false,
				"video": false
			}*/
		},
		"deleted": {
			"id": "http://wordnetweb.princeton.edu/perl/webwn?s=deleted",
			"display": {
				"en-US": "deleted"
			}/*,
			"contexts": {
				"forum": false,
				"wiki": true,
				"documents": true,
				"video": false
			}*/
		},
		"launched" : {
			"id" : "http://adlnet.gov/expapi/verbs/launched",
			"display" : {"en-US" : "launched",
				"es-ES" : "lanzó"}
		},
	};



}(window.WinkApp = window.WinkApp || {}));