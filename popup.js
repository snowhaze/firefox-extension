let settings = [
	{setting: browser.privacy.network.networkPredictionEnabled, name: "prediction", suggested: false},
	{setting: browser.privacy.network.peerConnectionEnabled, name: "rtc", suggested: false},
	{setting: browser.privacy.network.webRTCIPHandlingPolicy, name: "rtcip", suggested: "proxy_only"},
	{setting: browser.privacy.websites.cookieConfig, name: "cookie", suggested: {behavior: "reject_third_party", nonPersistentCookies: true}},
	{setting: browser.privacy.websites.firstPartyIsolate, name: "isolate", suggested: true},
//	still disabled by default in firefox nightly as of 3.3.
//	{setting: browser.privacy.websites.hyperlinkAuditingEnabled, name: "ping", suggested: false},
	{setting: browser.privacy.websites.referrersEnabled, name: "referrer", suggested: false},
	{setting: browser.privacy.websites.resistFingerprinting, name: "resist", suggested: true},
//	not supported by firefox
//	{setting: browser.privacy.websites.thirdPartyCookiesAllowed, name: "3rd_cookies", suggested: false},
	{setting: browser.privacy.websites.trackingProtectionMode, name: "tracking_protection", suggested: "always"},
];

document.getElementById("setall").onclick = function () {
	settings.forEach(function (setting) {
		setting.setting.set({value: setting.suggested});
	});
};

document.getElementById("newtab").onclick = async function () {
	await openNewTab(null);
	window.close();
};

document.getElementById("info-link").onclick = async function () {
	await openNewTab("intro.html");
	window.close();
}

document.getElementById("contact-link").onclick = async function () {
	let websiteLocale = browser.i18n.getMessage("websiteLocale");
	await openNewTab("https://snowhaze.com/" + websiteLocale + "/index.html#contact");
	window.close();
}

document.getElementById("dashboard-link").onclick = async function () {
	let websiteLocale = browser.i18n.getMessage("websiteLocale");
	await openNewTab("https://dashboard.snowhaze.com/" + websiteLocale);
	window.close();
}

document.getElementById("issues-link").onclick = async function () {
	await openNewTab("https://github.com/snowhaze/firefox-extension/issues");
	window.close();
}

if (!browser.history) {
	document.getElementById("forget_private_sites_row").style.display = "none";
}

async function openNewTab(url) {
	if (browser.contextualIdentities === undefined) {
		alert(browser.i18n.getMessage("contextualIdentitiesNotEnabledAlertMessage"));
		return;
	}
	let name = browser.i18n.getMessage("IMPORTANT_read_description_IMPORTANT_isolationContextualIdentityName");
	let context = await browser.contextualIdentities.create({name: name, color: "red", icon: "fence"});
	let tab;
	if (url) {
		tab = await browser.tabs.create({cookieStoreId: context.cookieStoreId, url: url});
	} else {
		tab = await browser.tabs.create({cookieStoreId: context.cookieStoreId});
	}
	if (tab.cookieStoreId !== context.cookieStoreId && !url) {
		browser.tabs.update(tab.id, {url: "contextual-ids-error.html"});
	}
}

async function load() {
	let values = {};
	settings.forEach(function (setting) {values[setting.name] = setting.setting.get({});});
	settings.forEach(async function (setting) {
		let value = await values[setting.name];
		setUI(setting.name, value, setting.setting, setting.suggested);
		if (setting.setting.onChange !== undefined) {
			setting.setting.onChange.addListener(function (change) {
				setUI(setting.name, change, setting.setting, setting.suggested);
			});
		}
	});
}

function setUI(name, setting, rawSetting, suggested) {
	//document.getElementById(name + "_value").innerText = JSON.stringify(setting.value);
	let action = document.getElementById(name + "_action");
	action.innerHTML = "";
	if (setting.levelOfControl == "controllable_by_this_extension" || setting.levelOfControl == "controlled_by_this_extension") {
		let button = document.createElement("button");
		let isAsSuggested = JSON.stringify(setting.value) == JSON.stringify(suggested);
		button.style.color = (isAsSuggested ? "green" : "red");
		button.style.fontFamily = "mono";
		button.style.fontSize = "0.8em";
		button.style.width = "16em";
		button.style.minHeight = "2em";
		button.style.background = "#fff";
		button.style.borderRadius = "5px";
		button.innerText = JSON.stringify(setting.value);
		button.onclick = function () {
			if (isAsSuggested) {
				rawSetting.clear({});
			} else {
				rawSetting.set({value: suggested});
			}
			if (rawSetting.onChange === undefined) {
				setTimeout(async function () {
					let value = await rawSetting.get({});
					setUI(name, value, rawSetting, suggested);
				}, 100);
			}
		}
		action.appendChild(button);
	} else {
		action.innerText = browser.i18n.getMessage("cannotChangeFFSettingValuePlacehoderText");
	}
}
load();

function setGlobalUI(name, value, callback) {
	//document.getElementById(name + "_value").innerText = JSON.stringify(value);
	let button = document.createElement("button");
	let title = (value ? browser.i18n.getMessage("settingOnButtonTitle") : browser.i18n.getMessage("settingOffButtonTitle"));
	button.innerText = title;
	button.style.color = (value ? "green" : "red");
	button.style.fontFamily= "mono";
	button.style.fontSize = "0.8em";
	button.style.width = "12em";
	button.style.height = "2em";
	button.style.background = "#fff";
	button.style.borderRadius = "5px";
	button.style.boxShadow = "none";
	button.onclick = function () {
		callback(name);
	};
	let action = document.getElementById(name + "_action");
	action.innerHTML = "";
	action.appendChild(button);
}

async function loadGlobals() {
	let settings = await browser.storage.local.get("ch_illotros_global_settings");
	settings = settings["ch_illotros_global_settings"];
	if (settings === undefined) settings = {};
	async function callback(name) {
		let value;
		let setting = globals.filter(setting => setting.name == name)[0];
		if (settings[name] === undefined) {
			value = setting.default;
		} else {
			value = settings[name];
		}
		settings[name] = !value;
		await browser.storage.local.set({ch_illotros_global_settings: settings});
		setGlobalUI(name, !value, callback);
	}
	globals.forEach(function (setting) {
		if (settings[setting.name] === undefined) {
			setGlobalUI(setting.name, setting.default, callback);
		} else {
			setGlobalUI(setting.name, settings[setting.name], callback);
		}
	});
}
loadGlobals();

// prompt alert box with setting explanation on mobile devices
if (!browser.history) {
	let showDescriptionMobile = function() {
		let attribute = this.getAttribute("title");
		alert(attribute);
	};
	let elements = document.getElementsByClassName("i18n-title");

	for (let i = 0; i < elements.length; i++) {
		elements[i].addEventListener("click", showDescriptionMobile);
	}
}
