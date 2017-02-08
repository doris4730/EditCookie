// globals
var tab_url,
search,
search_text,
str_cookies,
page_cookies = [],
timerStart = performance.now();

// point of entry -->

$(document).ready(function()
{
	logTimestamp(timerStart, 'dom ready');
	main_thread();
	set_handlers();
});

// point of entry <--

function main_thread()
{
	$('#cookie-info-form').hide();
	$('#add-cookie-form').hide();
	$('#cookie-table').show();
	
	sendMessage('GetCookies', '', function (response)
	{
		if (response !== undefined)
		{
			str_cookies = response;
			$(document).trigger('check_storage');
		}
		else
		{
			no_cookies();
		}
	});
}

// data-load events -->

$(document).on('check_storage', function()
{
	chrome.storage.sync.get({
		search: false,
		search_text: ''
	},
	function(items)
	{
		console.dir(items);
		search = items.search;
		search_text = items.search_text;
		
		if (search)
		{
			$('#control-search').addClass('btn-success');
			$('#control-search img').attr('src', '/img/search_white.png');
			$('.search-cookie').show();
			$('#search-cookie-input').val(search_text);
			$('#search-cookie-input').focus();
		}
		else
		{
			$('#control-search img').attr('src', '/img/search.png');
			$('.search-cookie').hide();
		}
		
		$(document).trigger('storage_ready');
	});
});

$(document).on('storage_ready', function()
{
	$(document).trigger('get_url');
});

$(document).on('get_url', function()
{
	chrome.tabs.getSelected(null, function(tab)
	{
		tab_url = tab.url;
		$(document).trigger('url_ready');
	});
});

$(document).on('url_ready', function()
{
	console.log('url: ' + tab_url);
	
	var cookies = str_cookies.split('; ');
	
	$('#cookie-content').empty();
	page_cookies = [];
	
	for (var i = 0; i < cookies.length; i++) {
		var item = cookies[i].split('=');
		var name = item[0];
		var value = item[1];
		
		addRow(i, name, value);
		
		chrome.cookies.get({
			url: tab_url,
			name : name
		},
		function(cookie)
		{
			page_cookies.push({
				name: cookie.name,
				value: cookie.value,
				expirationDate: cookie.expirationDate,
				domain: cookie.domain,
				hostOnly: cookie.hostOnly,
				path: cookie.path,
				secure: cookie.secure,
				httpOnly: cookie.httpOnly,
				session: cookie.session,
				storeId: cookie.storeId
			});
		});
	}
	console.dir(page_cookies);
	set_cookie_handlers();
	showCookieCount((!search ? cookies : $('#cookie-content').children().length));
});

// data-load events <--

// interface handlers -->

function set_handlers()
{
	$('#control-search').click(function() {
		$(this).toggleClass('btn-success');
		
		chrome.storage.sync.set({
			search: $(this).hasClass('btn-success')
			}, function() {
			main_thread();
		});
	});
	
	$('.navbar-brand').hover(function() {
		$("#cookie-monster").animate({
			top: "+=45"
			}, 500, function() {
			$("#cookie-monster").effect("shake", {
				direction: 'up',
				distance: 5,
				times: 1
			}, 500);
		});
	},
	function() {
		$("#cookie-monster").animate({
			top: "-=45"
		}, 500);
	});
	
	$("#cookie-monster").click(function() {
		$("#cookie-monster").effect("shake", {
			direction: 'left',
			distance: 10,
			times: 2
		}, 500);
	});
	
	$('#cookie-edit-back').click(function(event) {
		event.preventDefault();
		main_thread();
	});
	
	$('#cookie-edit-save').click(function(event) {
		event.preventDefault();
		var cookie_id = $('#cookie-info-form').attr('data-cookie-id');
		var cookie_date = new Date($('#cookie-edit-expires').val());
		var timestamp = Math.round(cookie_date.getTime() / 1000.0);
		
		editCookie(page_cookies[cookie_id].name, $('#cookie-edit-key').val(), 
		$('#cookie-edit-value').val(), 
		timestamp,
		function() {
			main_thread();
		});
	});
	
	$('#cookie-edit-delete').click(function(event) {
		event.preventDefault();
		var cookie_id = $('#cookie-info-form').attr('data-cookie-id');
		deleteCookie(page_cookies[cookie_id].name, function() {
			main_thread();
		});
	});
	
	$('#add-cookie').click(function() {
		var cur_width = $(window).width();
		$('.main').css('width', cur_width + 'px');
		$('.search-cookie').hide();
		$('#cookie-table').hide();
		$('#add-cookie-form').show();
	});
	
	$('#add-cookie-back').click(function() {
		event.preventDefault();
		main_thread();
	});
	
	$('#add-cookie-confirm').click(function() {
		addCookie($('#add-cookie-key').val(),
		$('#add-cookie-value').val(),
		$('#add-cookie-expires').val(),
		function() {
			main_thread();
		});
	});
	
	var save_search_text = function(val) {
		chrome.storage.sync.set({
			search_text: val
			}, function() {
			main_thread();
		});
	};
	
	$('#search-cookie-btn').click(function() {
		save_search_text($('#search-cookie-input').val());
	});
	
	$('#search-cookie-input').keydown(function(event) {
		if (event.which == 13) {
			event.preventDefault();
			save_search_text($(this).val());
		}
	});
	
	$(document).keydown(function(event) {
		if (event.ctrlKey && event.which == 70) {
			event.preventDefault();
			$('#control-search').click();
		}
	});
}

function set_cookie_handlers() {
	
	var enterPress = function(event) {
		if (event.which == 13) {
			event.preventDefault();
			$(this).blur();
		}
	};
	
	$('.cookie-key').off('change');
	$('.cookie-key').change(function(event) {
		var this_target = $(this);
		var this_cookie = 
		page_cookies[this_target.parents('tr').attr('data-cookie-id')];
		
		console.dir(this_cookie);
		editCookie(this_cookie.name, this_target.val(), this_cookie.value, 
		this_cookie.expirationDate,
		function() {
			highlightSaved(this_target);
			notifySaved();
		});
	});
	
	$('.cookie-key').off('keydown');
	$('.cookie-key').keydown(enterPress);
	
	$('.cookie-val').off('change');
	$('.cookie-val').change(function(event) {
		var this_target = $(this);
		var this_cookie = 
		page_cookies[this_target.parents('tr').attr('data-cookie-id')];
		
		console.dir(this_cookie);
		editCookie(this_cookie.name, this_cookie.name, this_target.val(), 
		this_cookie.expirationDate,
		function() {
			highlightSaved(this_target);
			notifySaved();
		});
	});
	
	$('.cookie-val').off('keydown');
	$('.cookie-val').keydown(enterPress);
	
	$('#cookie-content tr').off('hover');
	$('#cookie-content tr').hover(function() {
		$(this).find('.cookie-delete').show();
	},
	function() {
		$(this).find('.cookie-delete').hide();
	});
	
	$('.cookie-delete').off('click');
	$('.cookie-delete').click(function() {
		var target = $(this);
		deleteCookie(target.next().val(), 
		function() {
			highlightDeleted(target);
			notifyDeleted();
			decCookieCount(1);
		});
	});
	
	var addEdit = function() {
		$(this).parent().addClass('edit-now');
	};
	var removeEdit = function() {
		$(this).parent().removeClass('edit-now');
	};
	
	$('.cookie-key').off('click');
	$('.cookie-key').click(addEdit);
	
	$('.cookie-key').off('blur');
	$('.cookie-key').blur(removeEdit);
	
	$('.cookie-val').off('click');
	$('.cookie-val').click(addEdit);
	
	$('.cookie-val').off('blur');
	$('.cookie-val').blur(removeEdit);
	
	$('#cookie-content').off('contextmenu');
	$('#cookie-content').contextmenu(function(event) {
		event.preventDefault();
		var cookie_id = $(event.target).parents('tr').attr('data-cookie-id');
		console.log(cookie_id);
		var cur_width = $(window).width();
		$('.main').css('width', cur_width + 'px');
		$('.search-cookie').hide();
		$('#cookie-table').hide();
		$('#cookie-info-form').show();
		$('#cookie-info-form').attr('data-cookie-id', cookie_id);
		
		console.dir(page_cookies[cookie_id]);
		$('#cookie-edit-key').val(decodeURIComponent(page_cookies[cookie_id].name));
		$('#cookie-edit-value').val(decodeURIComponent(page_cookies[cookie_id].value));
		$('#cookie-edit-expires').val(formatDate(new Date(page_cookies[cookie_id].expirationDate * 1000.0)));
		$('#cookie-edit-more-info').val(decodeURIComponent(JSON.stringify(page_cookies[cookie_id])));
	});
}

// interface handlers <--

// cookie functions -->

function sendMessage(subject, message, callback)
{
	chrome.tabs.query(
	{
		active: true,
		currentWindow: true
	},
	function(tabs)
	{ 
		chrome.tabs.sendMessage(tabs[0].id,
		{
			from: 'popup',
			subject: subject,
			message: message
		},
		callback);
	});
}

function addCookie(name, value, expDays, callback) {
	sendMessage('AddCookie',
	{
		name: name,
		value: value,
		expDays: expDays
	},
	callback);
}

function setCookie(name, value, expTimestamp, callback)
{
	sendMessage('SetCookie',
	{
		name: name,
		value: value,
		expTimestamp: expTimestamp
	},
	callback);
}

function editCookie(oldName, newName, newValue, newExpTimestamp, callback)
{
	deleteCookie(oldName, function()
	{
		setCookie(newName, newValue, newExpTimestamp, callback);
	});
}

function deleteCookie(name, callback)
{
	sendMessage('DelCookie', name, callback);
}

// cookie functions <--

// interface functions -->

function showCookieCount(cookie) 
{
	function showCount(count) {
		$('#cookie-count').html('Found <b>' + count + '</b> cookies');
		$('#cookie-count').attr('data-cookie-count', count);
	}
	if (Array.isArray(cookie))
	{
		showCount(cookie.length);
	}
	else 
	{
		showCount(cookie);
	}
}

function decCookieCount(times)
{
	var new_val = +$('#cookie-count').attr('data-cookie-count') - times;
	$('#cookie-count').html('Found <b>' + new_val + '</b> cookies').hide().fadeIn();
	$('#cookie-count').attr('data-cookie-count', new_val);
}

function addRow(id, key, val)
{
	function appendCookie(id, key, val)
	{
		$('#cookie-content').append('<tr data-cookie-id="' + id + '" title="L-click: Quick editing, R-click: Advanced editing"><td><input type="text" class="cookie-key" placeholder="key" value="' + decodeURIComponent(key) + '"></td><td><textarea class="cookie-val" placeholder="value" rows="1">' + decodeURIComponent(val) + '</textarea><button class="cookie-delete btn btn-default btn-xs" title="delete cookie" style="display: none;"><img src="/img/delete.png" width="8"></button></td></tr>');
	}
	if (!search)
	{
		appendCookie(id, key, val);
	}
	else if (search && search_text && str_contains(key, search_text))
	{
		appendCookie(id, key, val);
	}
}

function notifySaved()
{
	$('#notification-bar').append('<span class="text-success">changes saved</span>').hide().fadeIn();
	setTimeout(function() {
		$('#notification-bar').children().fadeOut(600, function() {
			$(this).remove();
		});
	}, 2000);
}

function notifyDeleted()
{
	$('#notification-bar').append('<span class="text-danger">cookie deleted</span>').hide().fadeIn();
	setTimeout(function() {
		$('#notification-bar').children().fadeOut(600, function() {
			$(this).remove();
		});
	}, 2000);
}

function highlightSaved(target)
{
	target.parent().css('background', 'rgba(173,255,47,0.5)').hide().fadeIn();
}

function highlightDeleted(target)
{
	var this_target = target.parent().parent();
	this_target.css('background', 'salmon');
	setTimeout(function() {
		this_target.fadeOut(500, function() {
			$(this).remove();
		});
	}, 500);
}

function no_cookies()
{
	$('#cookie-table').hide();
	$('.no-cookies').fadeIn();
}

// interface functions <--

// other functions -->

function logTimestamp(start, name) {
	var timestamp = roundDouble(performance.now() - start);
	console.log('[' + timestamp + '] ' + name);
	return timestamp;
}

function roundDouble(num) {
	return Math.round(num * 100) / 100;
}

function str_contains(str, val) {
	return (str.indexOf(val) > -1);
}

function formatDate(date)
{
	return date.toLocaleString("en-US", {
		day : 'numeric',
		month : 'numeric',
		year : 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	});
}

// other functions <--