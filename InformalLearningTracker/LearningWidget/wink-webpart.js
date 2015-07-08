"use strict";

var WinkApp = WinkApp || {};
WinkApp.timeout = null;
WinkApp.timer = null;

var $jq = jQuery.noConflict();

jQuery(document).ready(function ($) {
	var conf = {
			"endpoint": "https://cloud.scorm.com/tc/yoururl/",
			"auth": "Basic " + toBase64("youremail@yahoo.com:yourpassword"),
			"debug": false
		};

	WinkApp.selfReport({ conf: conf });
});



WinkApp.selfReport = (function ($) {
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
				dash,
				$xapiWidget,
				$xapiDialog,
				$winkMsg,
				asynOnError = function (sender, args) {
					alert("Failed to get user name. Error:" + args.get_message());
				},
				getCurrentUserSuccess = function () {
					var user = {
						email: getUserEmail(spCurrentUser),
						name: getUserName(spCurrentUser)
					};

					clearInterval(WinkApp.timer);
					$xapiDialog.find("#txtUserName").text(user.name);
					$xapiDialog.find("#winkMessage").text("Widget ready to use.");

					dash = WinkApp.history({ conf: settings.conf , user: user });
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
				getPageObj = function () {
					var obj = {
						definition: {
							name: {
								"en-US": document.title
							}
						},
						id: document.location.toString(),
						objectType: "Activity"
					};

					return obj;
				},
				getRating = function (rating) {
					if (isNaN(parseInt(rating)))
						return undefined;

					var obj = {
						"http://id.tincanapi.com/extension/quality-rating": {
							min: 1,
							max: 5,
							raw: parseInt(rating)
						}
					};

					return obj;
				},
				ratingVerbs = ["viewed", "experienced", "launched"],
				setProgress = function (msg) {
					clearTimeout(WinkApp.timeout);
					$winkMsg.text(msg).show();
					WinkApp.timer = setInterval(function () {
						$winkMsg.text($winkMsg.text() + ". ");
					}, 500);
				},
				setTimeoutMessage = function (msg) {
					clearInterval(WinkApp.timer);
					clearTimeout(WinkApp.timeout);
					$winkMsg.text(msg).show();
					WinkApp.timeout = setTimeout(function () {
						$winkMsg.slideUp();
					}, settings.messageTimeout);
				};


			function initWidget() {
				$xapiWidget = jQuery("#xapiWidget");
				$xapiDialog = $xapiWidget.find("#frmXapiDialog");
				$winkMsg = $xapiWidget.find("div#winkMessage");
				$xapiDialog.find(".wink-radio-tgl").hide();
				session = new TinCan({
					recordStores: [settings.conf]
				});

				setProgress("Loading user information");
				loadCurrentUser();

				$xapiWidget.on("click", "#btnAddStatement", function () {
					$xapiDialog.slideToggle();
					$xapiDialog.find("#verbs").val("");
					$xapiDialog.find("#rating").val("");
				})
				.on("click", "#btnCancel", function () {
					$xapiDialog.slideUp();
				})
				.on("click", "#btnSave", function () {
					var	xstmt = {
							id: ADL.ruuid(),
							actor: getActor(),
							verb: WinkApp.verbs[$xapiDialog.find("#verb").val()],
							object: getPageObj(),
							context: {}
						},
						rating = getRating($xapiDialog.find("#rating").val());

					if (rating !== undefined)
						xstmt.context.extensions = rating;
					
					setProgress("Saving your learning experience");
					$xapiDialog.slideUp();
					session.sendStatement(xstmt, function (err, stmt) {
						var dt = ADL.dateFromISOString(stmt.timestamp),
						data = {
							actorName: stmt.actor.name,
							actorEmail: stmt.actor.mbox,
							verb: stmt.verb.display["en-US"],
							objectUri: stmt.target.id,
							objectName: stmt.target.definition.name["en-US"],
							timestamp: stmt.timestamp,
							rating: null,
							datestamp: WinkApp.pad(dt.getMonth() + 1) + "/" + WinkApp.pad(dt.getDate()) + "/" + dt.getFullYear(),
							timestampFmt: dt.toString()
						};

						if (stmt.context && stmt.context.extensions && stmt.context.extensions["http://id.tincanapi.com/extension/quality-rating"] && !isNaN(stmt.context.extensions["http://id.tincanapi.com/extension/quality-rating"].raw))
							data.rating = stmt.context.extensions["http://id.tincanapi.com/extension/quality-rating"].raw

						setTimeoutMessage("Your experience has been successfully saved!");
						WinkApp.dash.viewModel.addStatement(data);
					});

					return false;
				})
				.on("change", "#verb", function () {
					var $this = jQuery(this),
						val = $this.val();

					for (var i = 1; i < ratingVerbs.length; i++) {
						if (val === ratingVerbs[i]) {
							$xapiDialog.find(".wink-radio-tgl").show();
							return;
						}
					}

					$xapiDialog.find(".wink-radio-tgl").hide();
				});

			}// end initWidget()

			return initWidget();
		}//end function (params)
	); //end return
})(jQuery);

WinkApp.history = (function ($) {
	return (
		function (params) {
			var self = this,
				dash,
				session,
				$winkMsg,
				settings = $.extend({
					conf: {
						endpoint: "",
						auth: "",
						debug: true
					},
					user: {
						email: "",
						name: ""
					},
					messageTimeout: 6000
				},
				params), //end settings
				setProgress = function (msg) {
					clearTimeout(WinkApp.timeout);
					$winkMsg.text(msg).show();
					WinkApp.timer = setInterval(function () {
						$winkMsg.text($winkMsg.text() + ". ");
					}, 500);
				};

			function getActor() {
				var actor = {
					mbox: "mailto:" + settings.user.email,
					name: settings.user.name,
					objectType: "Agent"
				};

				return actor;
			}

			function initDashboard() {
				var cutoff = new Date(Date.now()),
					query;

				self.dash = {};
				self.session = new TinCan({
					recordStores: [settings.conf]
				});
				$winkMsg = jQuery("div#winkMessage"),
				setProgress("Loading informal learning history");
				cutoff = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() - 30);
				cutoff = cutoff.toISOString();
				self.session.actor = new TinCan.Agent(getActor());
				query = {
					since: cutoff,
					agent: self.session.actor
				};

				self.session.getStatements({
					params: query,
					callback: function (err, result) {
						clearInterval(WinkApp.timer);

						$.each(result.statements, function (i, value) {
							var dt = ADL.dateFromISOString(value.timestamp),
								rating = null;

							if (value.context && value.context.extensions && value.context.extensions["http://id.tincanapi.com/extension/quality-rating"])
								rating = value.context.extensions["http://id.tincanapi.com/extension/quality-rating"];

							value.datestamp = WinkApp.pad(dt.getMonth() + 1) + "/" + WinkApp.pad(dt.getDate()) + "/" + dt.getFullYear();
							value.timestampFmt = dt.toString();
							value.actorName = value.actor.name;
							value.actorEmail = value.actor.mbox;
							value.verb = value.verb.display["en-US"];
							value.objectUri = value.target.id;
							value.objectName = value.target.definition.name["en-US"];
							value.rating = (rating !== null && rating.raw !== undefined) ? rating.raw : undefined;
						});

						self.dash.viewModel = new WinkApp.StatementsViewModel(result.statements);
						ko.applyBindings(self.dash.viewModel);
						jQuery("#tblLRSData").slideDown();
						clearTimeout(WinkApp.timeout);
						$winkMsg.text("Your learning history was loaded successfully!");
						WinkApp.timeout = setTimeout(function () {
							$winkMsg.slideUp();
						}, settings.messageTimeout);

					}
				});

				return self.dash;
			}// end initDashboard()

			return initDashboard();
		} //end function (params)
	);//end return statement
})(jQuery);


WinkApp.StatementsViewModel = function (data) {
	var self = this;
	self.statements = ko.observableArray(data);
	self.addStatement = function (statement) {
		self.statements.unshift(statement);
	};
	self.pageSize = 10;
	self.currentPage = ko.observable(1);
	self.recordCount = ko.computed(function () {
		return self.statements().length;
	});

	self.maxPageIndex = ko.computed(function () {
		return Math.ceil(this.statements().length / this.pageSize);
	}, this);

	self.pagedItems = ko.computed(function () {
		var pg = this.currentPage(),
			start = this.pageSize * (pg - 1),
			end = start + this.pageSize;
		return this.statements().slice(start, end);
	}, this);

	self.firstPage = function () {
		self.currentPage(1);
	};

	self.nextPage = function () {
		if (this.nextPageEnabled())
			this.currentPage(this.currentPage() + 1);
	};

	self.previousPage = function () {
		if (this.previousPageEnabled())
			this.currentPage(this.currentPage() - 1);
	};

	self.lastPage = function () {
		self.currentPage(self.maxPageIndex());
	};

	self.nextPageEnabled = ko.computed(function () {
		return this.statements().length > this.pageSize * this.currentPage();
	}, this);

	self.previousPageEnabled = ko.computed(function () {
		return this.currentPage() > 1;
	}, this);

	self.verbs = ko.computed(function () {
		var arr = [],
			doCompare = function (a, b) {
				if (a.value.toLowerCase() === b.value.toLowerCase())
					return 0;
				else if (a.value.toLowerCase() < b.value.toLowerCase())
					return -1;
				else
					return 1;
			};

		for (var key in WinkApp.verbs) {
			if (key) {
				arr.push({
					value: key,
					label: key
				});
			}
		}

		return arr.sort(doCompare);
	}, this);

	self.headers = [
		{ title: "Action", sortPropertyName: "verb", asc: true },
		{ title: "Activity", sortPropertyName: "objectName", asc: true },
		{ title: "Rating", sortPropertyName: "rating", asc: true },
		{ title: "When", sortPropertyName: "timestamp", asc: true }
	];
	self.activeSort = self.headers[0]; //set the default sort
	self.sort = function(header, event){
		var prop = header.sortPropertyName,
			ascSort = function (a, b) { return a[prop] < b[prop] ? -1 : a[prop] > b[prop] ? 1 : a[prop] === b[prop] ? 0 : 0; },
			descSort = function (a, b) { return ascSort(b, a); },
			sortFunc;

		//if this header was just clicked a second time...
		if (self.activeSort === header) {
			header.asc = !header.asc; //...toggle the direction of the sort
		} else {
			self.activeSort = header; //first click, remember it
		}

		sortFunc = self.activeSort.asc ? ascSort : descSort;
		
		self.statements.sort(sortFunc);

	};

	self.selectedStatement = ko.observable();
	self.selectStatement = function (stmt) {
		self.selectedStatement(stmt);
		jQuery("#frmXapiDetail").show();
	};
	self.closeStatement = function () {
		jQuery("#frmXapiDetail").hide();
	};
};
