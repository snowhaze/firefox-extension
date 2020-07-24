for (let el of document.getElementsByClassName("i18n")) {
	el.innerText = browser.i18n.getMessage(el.innerText);
}

for (let el of document.getElementsByClassName("i18n-title")) {
	let title = el.getAttribute("title");
	let msg = browser.i18n.getMessage(title);
	el.setAttribute("title", msg);
}

for (let el of document.getElementsByClassName("i18n-link")) {
	let websiteLocale = browser.i18n.getMessage("websiteLocale");
	el.href = el.href.replace("$$lang$$", websiteLocale);
}

// OS support of shortcut description
for (let el of document.getElementsByClassName("cmd")) {
	let cmd_title = (navigator.appVersion.indexOf("Mac")!=-1) ? 'Cmd+Alt+T' : 'Ctrl+Alt+T'
	el.innerText = cmd_title;
}