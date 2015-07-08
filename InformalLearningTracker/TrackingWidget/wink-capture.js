"use strict";

var WinkApp = WinkApp || {};
WinkApp.timeout = null;
WinkApp.timer = null;
//WinkApp.session = new TinCan();

$(document).ready(function () {

	WinkApp.capture({ conf: WinkApp.conf });
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
				session,
				$winkMsg = $("#winkCaptureStatus"),
				asynOnError = function (sender, args) {
					alert("Failed to get user name. Error:" + args.get_message());
				},
				getCurrentUserSuccess = function () {
					var user = {
						email: getUserEmail(spCurrentUser),
						name: getUserName(spCurrentUser)
					};
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
					else if (objectUri.substring(0, 1) === "/")
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
				postStatement = function (verb, objectName, objectUri, update) {
					var xstmt = {
						id: ADL.ruuid(),
						actor: getActor(),
						verb: WinkApp.verbs[verb],
						object: getXapiObject(objectName, objectUri),
					},
					resp_obj = session.sendStatement(xstmt);

					if (update !== undefined && update){
						if (WinkApp.dash !== undefined && resp_obj.statement.id !== undefined) {
							var stmt = resp_obj.statement,
								dt = ADL.dateFromISOString(stmt.timestamp),
								data = {
									verb: stmt.verb.display["en-US"],
									objectUri: stmt.target.id,
									objectName: stmt.target.definition.name["en-US"],
									timestamp: stmt.timestamp,
									rating: "",
									datestamp: WinkApp.pad(dt.getMonth() + 1) + "/" + WinkApp.pad(dt.getDate()) + "/" + dt.getFullYear(),
									timestampFmt: dt.toString()
								};

							if (stmt.context && stmt.context.extensions && stmt.context.extensions["http://id.tincanapi.com/extension/quality-rating"])
								data.rating = stmt.context.extensions["http://id.tincanapi.com/extension/quality-rating"].raw

							WinkApp.dash.viewModel.addStatement(data);
						}
					}
				};


			function initCapture() {
				session = new TinCan({
					recordStores: [settings.conf]
				});
				loadCurrentUser();
				//new forum post
				$('[id^="forum"][id$="NewPostLink"]').on("click", function () {
					var $this = $(this),
						objectName = $this.parents(".ms-webpartzone-cell").find(".js-webpart-titleCell").attr("title"),
						objectUri = $this.attr("href");

					postStatement("created", objectName, objectUri);

					//return false;
				});

				//view forum post
				$(".ms-comm-postListItem .ms-comm-postSubjectColumn a").on("click", function () {
					var $this = $(this),
						objectName = $this.find("span").text(),
						objectUri = $this.attr("href");

					postStatement("viewed", objectName, objectUri);

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

				//media play, capture the play event
				$(".mediaPlayerContainer .mediaPlayerInitialPlayButton a[title='Play']").on("click", function () {
					var $this = $(this),
						$videoContainer = $this.parents(".mediaPlayerContainer"),
						objectName = $videoContainer.parents(".ms-webpartzone-cell").find(".ms-webpart-titleText span:eq(0)").text(),
						objectUri = $videoContainer.find("video source").attr("src");

					postStatement("launched", objectName, objectUri, true);

				});

				//micro blog, capture the post event
				$(".ms-microfeed-fullMicrofeedDiv .ms-microfeed-postButton").on("click", function () {
					var $this = $(this),
						$feedTitle = $this.parents(".ms-microfeed-fullMicrofeedDiv").find(".ms-microfeed-feedTitleLabel"),
						newsTitle = $feedTitle.text().trim(),
						url = $feedTitle.attr("href"),
						pageTitle = $(".ms-core-pageTitle span").text(),
						objectName = (newsTitle === "Newsfeed") ? pageTitle.trim() + " - " + newsTitle : newsTitle,
						objectUri = (url === "#") ? window.location.href.toString() : url;
					
					if ($this.attr("id").indexOf("ms-postreplybutton") < 0)
						postStatement("posted", objectName, objectUri, true);
				});
				
				//micro blog, capture the post reply event
				$(".ms-microfeed-fullMicrofeedDiv .ms-microfeed-postReplyButtonSpan > button").on("click", function () {
					var $this = $(this),
						$feedTitle = $this.parents(".ms-microfeed-fullMicrofeedDiv").find(".ms-microfeed-feedTitleLabel"),
						url = $feedTitle.attr("href"),
						objectName = $this.parents(".ms-microfeed-thread").find(".ms-microfeed-postBody:eq(0)").text().trim(),
						objectUri = (url === "#") ? window.location.href.toString() : url;

					postStatement("responded", objectName, objectUri, true);
				});

			}// end initCapture()

			return initCapture();
		}//end function (params)
	); //end return
})(jQuery);