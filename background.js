if (browser.commands) {
	browser.commands.onCommand.addListener(async function (command) {
		if (command == "new-isolated-tab") {
			let name = browser.i18n.getMessage("IMPORTANT_read_description_IMPORTANT_isolationContextualIdentityName");
			let context = await browser.contextualIdentities.create({name: name, color: "red", icon: "fence"});
			let tab = await browser.tabs.create({cookieStoreId: context.cookieStoreId});
			if (tab.cookieStoreId !== context.cookieStoreId) {
				browser.tabs.update(tab.id, {url: "contextual-ids-error.html"});
			}
		}
	});
}

async function load_split_json(name, count) {
	let promises = new Array(count);
	for (let i = 0; i < count; i++) {
		promises[i] = fetch("/" + name + "-" + (i + 1) + "-" + count + ".json");
	}
	for (let i = 0; i < count; i++) {
		promises[i] = (await promises[i]).json();
	}
	let result = new Array();
	for (let i = 0; i < count; i++) {
		result = result.concat(await promises[i]);
	}
	return result;
}

let https_sites = (async function () {
	return new Set(await load_split_json("https", 8));
})();
async function is_known_https_site(url) {
	if (https_sites instanceof Promise) {
		https_sites = await https_sites;
	}
	return https_sites.has(url.hostname);
}

let private_sites = (async function () {
	return new Set(await load_split_json("private", 1));
})();
async function is_private_site(url) {
	if (private_sites instanceof Promise) {
		private_sites = await private_sites;
	}
	let host = new URL(url).hostname;
	if (private_sites.has(host)) return true;
	if (host.startsWith("www.") && private_sites.has(host.substr(4))) return true;
	return false;
}

let tracking_parameters = (async function () {
	let result = new Map();
	let raw_tracking_parameters = await load_split_json("tracking_parameters", 1);
	raw_tracking_parameters.forEach(function (data) {
		let name = data.name;
		// work around js regex limitations
		if (name.startsWith("\\A")) name = "^" + name.substr(2);
		if (name.endsWith("\\z") || name.endsWith("\\Z")) name = name.substr(0, name.length - 2) + "$";
		let regexes = [new RegExp(name)];
		if (result.has(data.host)) regexes = regexes.concat(result.get(data.host));
		result.set(data.host, regexes);
	});
	return result
})();

async function cleanContexts() {
	let contexts = await browser.contextualIdentities.query({});
	let possibleNames = ["SnowHaze Isolated", "SnowHaze Isoliert", "SnowHaze Isolé"];
	contexts = contexts.filter(context => ~possibleNames.indexOf(context.name) && context.color == "red" && context.icon == "fence");
	let clear = new Set();
	contexts.forEach(context => clear.add(context.cookieStoreId));
	if (browser.sessions) {
		let sessions = await browser.sessions.getRecentlyClosed();
		sessions.forEach(function (session) {
			if (!session.tab) return;
			clear.delete(session.tab.cookieStoreId);
		});
	}
	let tabs = await browser.tabs.query({});
	tabs.forEach(tab => clear.delete(tab.cookieStoreId));
	clear.forEach(id => browser.contextualIdentities.remove(id));
}

cleanContexts();
if (browser.sessions) {
	browser.sessions.onChanged.addListener(cleanContexts);
}

let lastDowngrade = null;
async function makeHTTPSUpgrades(request) {
	let url = new URL(request.url);
	if (await is_known_https_site(url) && url.hostname !== lastDowngrade) return {upgradeToSecure: true};
}

function detectHTTPSDowngrades(request) {
	request.responseHeaders.forEach(function (header) {
		if (header.name.toLowerCase() !== "location" || !header.value) return;
		let url = new URL(header.value, request.url);
		if (url.protocol !== "http:") return;
		if (request.url.hostname === url.hostname) lastDowngrade = url.hostname;
	});
	
}

tabUpgrades = new Map();

async function cleanTabUpgradeData() {
	let clear = new Set(tabUpgrades.keys());
	let sessions = await browser.sessions.getRecentlyClosed();
	sessions.forEach(function (session) {
		if (!session.tab) return;
		clear.delete(session.tab.tabId);
	});
	let tabs = await browser.tabs.query({});
	tabs.forEach(tab => clear.delete(tab.tabId));
	clear.forEach(id => tabUpgrades.delete(id));
}

if (browser.sessions) {
	browser.sessions.onChanged.addListener(cleanTabUpgradeData);
}

function attemptHTTPSUpgrades(request) {
	let url = new URL(request.url);
	let oldData = tabUpgrades.get(request.tabId);
	let ignores = null;
	if (oldData) {
		clearTimeout(oldData.currentTimer);
		ignores = oldData.ignores;
	}
	if (!ignores || !ignores.has(url.host)) {
		let timer = setTimeout(function() {
			browser.tabs.update(request.tabId, {url: request.url});
		}, 5000);
		tabUpgrades.set(request.tabId, {
			currentURL: request.url,
			currentRequest: request.requestId,
			currentTimer:timer,
			ignores: ignores
		});
		return {upgradeToSecure: true};
	}
}

function cancelHTTPSUpgradesFallback(request) {
	let data = tabUpgrades.get(request.tabId);
	if (!data) return;
	clearTimeout(data.currentTimer);
}

function performHTTPSUpgradesFallback(request) {
	let data = tabUpgrades.get(request.tabId);
	if (!data) return;
	clearTimeout(data.currentTimer);
	if (request.requestId != data.currentRequest) return;
	let url = new URL(request.url);
	if (!data.gnores) data.ignores = new Set();
	data.ignores.add(url.host);
	tabUpgrades.set(request.tabId, data);
	browser.tabs.update(request.tabId, {url: data.currentURL});
}

function blockMixedContent(request) {
	if (!request.documentUrl) return;
	let url = new URL(request.documentUrl);
	if (url.protocol === "https:") return {upgradeToSecure: true};
}

async function trimTrackingParameters(request) {
	let url = new URL(request.url);
	let components = url.hostname.split(".");
	let regexes = [];
	let params = tracking_parameters;
	if (params instanceof Promise) {
		params = await params;
	}
	if (params.has(url.hostname)) regexes = regexes.concat(params.get(url.hostname));
	for (let i = 0; i <= components.length; i++) {
		let domain = "*" + components.slice(i).join(".");
		if (params.has(domain)) regexes = regexes.concat(params.get(domain));
	}
	let changed = false;
	for (let pair of url.searchParams.entries()) {
		for (let regex of regexes) {
			if (regex.test(pair[0])) {
				url.searchParams.delete(pair[0]);
				changed = true;
				break;
			}
		}
	}
	if (changed) return {redirectUrl: url.href};
}

async function deletePrivateSites(history) {
	if (await is_private_site(history.url)) browser.history.deleteUrl({url: history.url});
}

function setForceHTTPS(newValue) {
	if (newValue) {
		browser.webRequest.onBeforeRequest.addListener(makeHTTPSUpgrades, {urls: ["http://*/*"]}, ["blocking"]);
		browser.webRequest.onHeadersReceived.addListener(detectHTTPSDowngrades, {urls: ["https://*/*"]}, ["responseHeaders"]);
	} else {
		browser.webRequest.onBeforeRequest.removeListener(makeHTTPSUpgrades);
		browser.webRequest.onHeadersReceived.removeListener(detectHTTPSDowngrades);
	}
}

function setTryHTTPSFirst(newValue) {
	if (newValue) {
		browser.webRequest.onBeforeRequest.addListener(attemptHTTPSUpgrades, {urls: ["http://*/*"], types: ["main_frame"]}, ["blocking"]);
		browser.webRequest.onHeadersReceived.addListener(cancelHTTPSUpgradesFallback, {urls: ["https://*/*"], types: ["main_frame"]});
		browser.webRequest.onErrorOccurred.addListener(performHTTPSUpgradesFallback, {urls: ["https://*/*"], types: ["main_frame"]});
	} else {
		browser.webRequest.onBeforeRequest.removeListener(attemptHTTPSUpgrades);
		browser.webRequest.onHeadersReceived.removeListener(cancelHTTPSUpgradesFallback);
		browser.webRequest.onErrorOccurred.removeListener(performHTTPSUpgradesFallback);
	}
}

function setMixedContentBlocking(newValue) {
	if (newValue) {
		browser.webRequest.onBeforeRequest.addListener(blockMixedContent, {urls: ["http://*/*"]}, ["blocking"]);
	} else {
		browser.webRequest.onBeforeRequest.removeListener(blockMixedContent);
	}
}

function setTrackingParameterTriming(newValue) {
	if (newValue) {
		browser.webRequest.onBeforeRequest.addListener(trimTrackingParameters, {urls: ["*://*/*"]}, ["blocking"]);
	} else {
		browser.webRequest.onBeforeRequest.removeListener(trimTrackingParameters);
	}
}

async function setForgetPrivateSites(newValue) {
	if (newValue) {
		browser.history.onVisited.addListener(deletePrivateSites);
		let items = await browser.history.search({text: "", maxResults: 1000000});
		for (item of items) {
			if (await is_private_site(item.url)) browser.history.deleteUrl({url: item.url});
		}
	} else {
		browser.history.onVisited.removeListener(deletePrivateSites);
	}
}

let current_settings = {
	force_https: false,
	mixed_content_blocking: false,
	trim_tracking_parameters: false,
	forget_private_sites: false,
}
function applySettings(settings) {
	globals.forEach(function (setting) {
		let should_set = settings[setting.name];
		if (should_set === undefined) should_set = setting.default;
		if (current_settings[setting.name] === should_set) return;
		current_settings[setting.name] = should_set;
		if (setting.name == "force_https") setForceHTTPS(should_set);
		else if (setting.name == "try_https_first") setTryHTTPSFirst(should_set);
		else if (setting.name == "mixed_content_blocking") setMixedContentBlocking(should_set);
		else if (setting.name == "trim_tracking_parameters") setTrackingParameterTriming(should_set);
		else if (setting.name == "forget_private_sites") setForgetPrivateSites(should_set);
	});
}

async function loadSettings() {
	let settings = await browser.storage.local.get("ch_illotros_global_settings");
	settings = settings["ch_illotros_global_settings"];
	if (settings === undefined) settings = {};
	applySettings(settings);
	browser.storage.onChanged.addListener(function (changes, area) {
		changes = changes["ch_illotros_global_settings"];
		if (area !== "local") return;
		applySettings(changes.newValue);
	});
}

loadSettings()
