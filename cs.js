chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    if (msg.subject === 'GetCookies') {
        response(document.cookie);
	}
	else if (msg.subject === 'SetCookie'){
		var data = msg.message;
		setCookie(data.name, data.value, data.expTimestamp);
		response(1);
	}
	else if (msg.subject === 'AddCookie') {
		var data = msg.message;
		addCookie(data.name, data.value, data.expDays);
		response(1);
	}
	else if (msg.subject === 'DelCookie') {
		deleteCookie(msg.message);
		response(1);
	}
});

function stringContains(string, value){
	return string.indexOf(value)>-1;
}

function getCookie(name){
	var array = document.cookie.split("; ");
	for (var i = 0; i < array.length; i++){
		if (stringContains(array[i], name + "=")){
			var value = array[i].split("=")[1];
			return (value ? value : null);
		}
	}
	return null;
}

function setCookie(name, value, expTimestamp) {
	var expDate = new Date(expTimestamp * 1000.0);
	var nameValue = name + "=" + value + "; ";
	document.cookie = nameValue + "path=/; expires=" + expDate.toUTCString();
}

function addCookie(name, value, expiresDays) {
	var nameValue = name + "=" + value + "; ";
	var date = new Date();
	date.setDate(date.getDate() + (+expiresDays));
	document.cookie = nameValue + "path=/; expires=" + date.toUTCString();
}

function deleteCookie(name) {
	if (getCookie(name)!= null) {
		var date = new Date(0);
		var newName = name + "=; ";
		document.cookie = newName + "path=/; expires=" + date.toUTCString();
		return true;
	}
	else return false;
}