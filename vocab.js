// vocab.js

// VocabDB: Object abstracting db operations
var VocabDB = function(dbsrc) {
    if(!dbsrc) throw new ReferenceError()
    if(!(dbsrc instanceof IDbSrc))
	throw new TypeError("dbsrc does not implement IDbSrc");
    this.DB = dbsrc;
    Object.defineProperty(this, "Status", {get:function(){return this.DB.hasOwnProperty("Status") ? this.DB.Status : 2; }});
};
VocabDB.prototype.Get = function(query) {
    return this.DB.get(query);
};
VocabDB.prototype.Set = function(query) {
    return this.DB.set(query);
};
VocabDB.prototype.Delete = function(query) {
    return this.DB.del(query);
};

// IDbSrc: Abstract interface to be implemented by a database source
var IDbSrc = function(){};
var unimplemented = function() {
    throw new Error("Function is unimplemented!");
};
IDbSrc.prototype.get = unimplemented;
IDbSrc.prototype.set = unimplemented;
IDbSrc.prototype.del = unimplemented;

// SimulDbSrc: Simulated implementation of IDbSrc
// Constructor
var SimulDbSrc = function() {
    // Elements are added manually for simulation into the following array.
    //>An element has the following format:
    //>{ module:MODULE, phrase:PHRASE, translation:TRANSLATION,
    //>  usage:[{usage:USAGE, translation:TRANLSATION}] }
    this.db = [ {module:"Basics", phrase:"ik", translation:"I",
		 usage:[{usage:"Ik ben", translation:"I am"}]},
		{module:"Basics", phrase:"jij", translation:"you",
		 usage:[{usage:"Jij bent", translation:"You are"}]},
		{module:"Basics", phrase:"je", translation:"you",
		 usage:[{usage:"Je bent", translation:"You are"},
			{usage:"Ik heb je", translation:"I have you"}]},
		{phrase:"wij", translation:"we"},
		{module:"Verbs", phrase:"rennen", translation:"to run",
		 usage:[{usage:"Ik ren", translation:"I run"},
			{usage:"Je rent", translation:"You run"},
			{usage:"Wij rennen", translation:"We run"}]}];
};
// Implements IDbSrc
SimulDbSrc.prototype = Object.create(IDbSrc.prototype);
SimulDbSrc.prototype.get = function(q){
    q = q || {};
    if(typeof q != "object") q = {"filter":q.toString()};
    var mods = q.hasOwnProperty("mods") ? q.mods : false;
    // Modules list mode
    if(mods) return this.getmods();
    // Items query mode
    var module = q.hasOwnProperty("module") ? q.module : undefined;
    var filter = q.hasOwnProperty("filter") ? q.filter : undefined;
    var index = q.hasOwnProperty("index") ? parseInt(q.index) : undefined;
    var querydb = [];
    if(!isNaN(index) && index < this.db.length) return this.db[index];
    for(var i in this.db)
	if((!module || this.db[i].module == module) && (!filter || this.db[i].phrase.toLowerCase().indexOf(filter.toLowerCase()) >= 0 || this.db[i].translation.toLowerCase().indexOf(filter.toLowerCase()) >= 0))
	    querydb.push({"index":i, "item":this.db[i]});
    return querydb;
};
SimulDbSrc.prototype.set = function(q){
    if(!q || typeof q != "object") throw new TypeError();
    var index = q.hasOwnProperty("index") ? parseInt(q.index) : undefined;
    var item = q.hasOwnProperty("item") ? q.item : undefined;
    if(!item || typeof item != "object") throw new Error();
    // No validation on the item
    if(!isNaN(index) && index < this.db.length) {
	this.db[index] = item;
	//for(prop in item) this.db[index][prop] = item[prop];
    }
    else this.db.push(item);
};
SimulDbSrc.prototype.del = function(q){
    if(!q || typeof q != "object") throw new TypeError();
    var index = q.hasOwnProperty("index") ? parseInt(q.index) : undefined;
    if(!isNaN(index) && index < this.db.length) this.db.splice(index, 1);
};
// Extends IDbSrc
SimulDbSrc.prototype.getmods = function(){
    var mods = {};
    for(var i in this.db) {
	if(!this.db[i].hasOwnProperty("module")) continue;
	if(!mods.hasOwnProperty(this.db[i].module))
	    mods[this.db[i].module] = 1;
	else ++mods[this.db[i].module];
    }
    return mods;
};

// LocalFileDbSrc: Object abstracting and wrapping operations for a local file
//>with a special format acting as a database.
// Constructor
var LocalFileDbSrc = function(fileobj) {
    // Variables indicating status
    this.Status = 1;
    this.File = undefined;
    // Array to contain data items
    this.db = [];
    // Load file object, if any
    if(!fileobj) {
	try {
	    this.File = new LocalFsDbFile(this);
	}
	catch(e) { this.File = undefined; this.Status = 0; }
    }
    else {
	try {
	    var reader = new LocalDbFileReader(this);
	    reader.readAsText(fileobj);
	}
	catch(e) { this.File = undefined; this.Status = 0; }
    }
};
// Implements IDbSrc
LocalFileDbSrc.prototype = Object.create(IDbSrc.prototype);
LocalFileDbSrc.prototype.get = function(q) {
    // Get from memory, no need to read the file again
    return SimulDbSrc.prototype.get.call(this, q);
};
LocalFileDbSrc.prototype.set = function(q){
    // Update in memory
    SimulDbSrc.prototype.set.call(this, q);
    // Update file
    if(this.File && (this.File instanceof LocalFsDbFile))
	this.File.Write(this.db);
    else {
	var msg = 'Read-only mode.\nModifications are only applied in memory and will be lost when the application is closed.\nPlease use Webkit Filesystem API supported browser for persistence.';
	console.warn(msg); window.alert(msg);
    }
};
LocalFileDbSrc.prototype.del = function(q) {
    // Update in memory
    SimulDbSrc.prototype.del.call(this, q);
    // Update file
    if(this.File && (this.File instanceof LocalFsDbFile))
	this.File.Write(this.db);
    else {
	var msg = 'Read-only mode.\nModifications are only applied in memory and will be lost when the application is closed.\nPlease use Webkit Filesystem API supported browser for persistence.';
	console.warn(msg); window.alert(msg);
    }
};
// ExtendsIDbSrc
LocalFileDbSrc.prototype.getmods = function(){
    return SimulDbSrc.prototype.getmods.call(this);
};

// LocalFsDbFile: Object wrapping operations on a sandboxed local filesystem
//>database file.
var LocalFsDbFile = function(parentDb, dbfile/*, onsuccess, onfail*/) {
    if(!parentDb || !(parentDb instanceof LocalFileDbSrc))
       throw new TypeError();
    this.Parent = parentDb;
    this.FileEntry = undefined;
    this.NotifierId = 'notifier' + new Date().valueOf().toString();
    var parentInstance = this;
    dbfile = dbfile || 'lang.db';
    var maxsize = 10 * 1024 * 1024; // I don't expect it to grow more than 10MB
    // Using the local filesystem API
    var quotaGranted = function(q) {
	var onInit = function(fs){
	    var onRead = function(f) {
		parentDb.Status = 2;
		parentInstance.FileEntry = f;
		parentInstance.Read();
	    };
	    var onError = function(e) {
		console.error(e); parentDb.Status = 0;
	    };
	    fs.root.getFile(dbfile, {create:"true"}, onRead, onError);
	};
	window.webkitRequestFileSystem(PERSISTENT, q, onInit);
    };
    var errFunction = function(e) {
	var msg = /chrom/i.test(window.navigator.userAgent) ? "Please relaunch Chrome with --allow-file-access-from-files" : "Error";
	window.alert(msg);
	console.error(msg);
    };
    // Notifier html
    var html = '<style type="text/css">';
    html += '#' + this.NotifierId + ' { font:9pt Arial,sans-serif;position:absolute;bottom:4px;right:4px;height:16px;border:1px solid #f0c36d;background:#f9edbe;padding:3px;/*display:none;*/}';
    html += '</style><div id="' + this.NotifierId + '">Loading...</div>';
    //
    if(navigator.webkitPersistentStorage) {
	document.body.innerHTML += html;
	navigator.webkitPersistentStorage.requestQuota(maxsize,
						       quotaGranted,
                                                       errFunction);
    }
    else if(window.webkitStorageInfo) {
	document.body.innerHTML += html;	
	window.webkitStorageInfo.requestQuota(PERSISTENT,
					      maxsize, quotaGranted,
					      errFunction);
    }
    else throw new Error('Unsupported');
};
LocalFsDbFile.prototype.Read = function() {
    var parentDb = this.Parent, notifier = this.NotifierId;
    var onRead = function(file) {
	var r = new FileReader();
	r.onloadend = function(e) {
	    var lines = this.result.trim().split('\n');
	    parentDb.db = [];
	    for(var i in lines) {
		var cleanline = lines[i].trim(), c = cleanline[0];
		// The following RegExp could need lots of improvements
		var re = /[^,]+,[^,]+(,[^,]+)?(,[^,:]+:[^,:]+)*/;
		if(c && c != '#' && re.test(cleanline)) {
		    var flds = cleanline.split(',');
		    var item = { "phrase":flds[0].trim(),
				 "translation":flds[1].trim() };
		    if(flds.length > 2) {
			if(flds[2]) item.module = flds[2];
			if(flds.length > 3) {
			    var usage = [];
			    for(var j = 3; j < flds.length; ++j) {
				if(/[^:]+:[^:]/.test(flds[j])) {
				    var usages = flds[j].split(':');
				    usage.push({"usage":usages[0].trim(),
						"translation":usages[1].trim()})
				}
			    }
			}
			if(usage.length) item.usage = usage;
		    }
		    parentDb.db.push(item);
		}
		var furl = parentDb.File.FileEntry.toURL()
		document.getElementById(notifier).innerHTML = 'Loaded file <a href="' + furl + '" target="_blank">' + furl + '</a>';
	    }
	};
	r.readAsText(file);
    };
    var onError = function(e) { console.error(e); };
    this.FileEntry.file(onRead, onError);
};
LocalFsDbFile.prototype.Write = function(data/*, append*/) {
    var fe = this.FileEntry, notifier = this.NotifierId;
    document.getElementById(notifier).innerHTML = 'Writing...';
    this.FileEntry.createWriter(function(truncator) {
	truncator.onwriteend = function(e) {
	    fe.createWriter(function(fileWriter) {
		fileWriter.onwriteend = function(e) {
		    document.getElementById(notifier).innerHTML = 'Successfully written to <a href="' + fe.toURL() + '" target="_blank">' + fe.toURL() + '</a>';
		};
		fileWriter.onerror= function(e) {
		    document.getElementById(notifier).innerHTML = 'Write failed: ' + e.toString();
		};
		var l = [ commentOut('This file was automatically generated. Manual modifications could lead to inconsistencies and data corruption, please edit it with care.'), '\n', commentOut('Line format:'), commentOut('PHRASE,TRANSLATION,[MODULE],[USAGE(1):TRANSLATION(1),...,USAGE(n):TRANSLATION(n)]', !0), '\n'];
		for(var i in data) {
		    var line = data[i].phrase + ',' + data[i].translation + ',' + (data[i].hasOwnProperty("module") && data[i].module.length ? data[i].module : '');
		    if(data[i].hasOwnProperty("usage") && data[i].usage.length){
			for(var j in data[i].usage) {
			    line += ',' + data[i].usage[j].usage + ':' + data[i].usage[j].translation;
			}
		    }
		    else line += ',';
		    line += '\n';
		    l.push(line);
		}
		var blob = new Blob(l, {type: 'text/plain'});
		fileWriter.write(blob);
	    });
	};
	truncator.onerror = function(e) {
	    document.getElementById(notifier).innerHTML = 'Write failed: ' + e.toString();
	};
	truncator.truncate(0);
    });
};
var commentOut = function(text, force, width) {
    width = width || 80;
    var actWidth = width - 2;
    if(text.length <= actWidth || force) return ('# ' + text + '\n');
    else {
	var idx, re = /\s+[^\s]+/, str = '', tmp, formatted = [], done = false;
	while(str.length <= actWidth && !done) {
	    idx = text.search(re);
	    if(idx < 0) {
		done = true;
		tmp = text; idx = tmp.length;
	    }
	    else tmp = text.substr(0, idx);
	    if((str + tmp).length > actWidth) {
		formatted.push(str.trimRight());
		str = '';
	    }
	    str += text.substr(0, idx);
	    text = text.substr(idx);
	    while(text[0] !== undefined && /\s/.test(text[0])) {
		if(str.length < actWidth) str += text[0];
		text = text.substr(1);
	    }
	}
	if(str) formatted.push(str.trimRight());
	return ('# ' + formatted.join('\n#>') + '\n');
    };
}

// LocalDbFileReader: Special FileReader (I should obsolete it)
var LocalDbFileReader = function(parentdb){
    if(!parentdb || !(parentdb instanceof LocalFileDbSrc))
	throw new TypeError();
    var f = new FileReader();
    f.parent =  parentdb;
    f.onloadend = function(e) {
	this.parent.Status = 2;
	var lines = this.result.trim().split('\n');
	this.parent.db = [];
	for(var i in lines) {
	    var cleanline = lines[i].trim(), c = cleanline[0];
	    // The following RegExp could need lots of improvements
	    var re = /[^,]+,[^,]+(,[^,]+)?(,[^,:]+:[^,:]+)*/;
	    if(c && c != '#' && re.test(cleanline)) {
		var flds = cleanline.split(',');
		var item = { "phrase":flds[0].trim(),
			     "translation":flds[1].trim() };
		if(flds.length > 2) {
		    if(flds[2]) item.module = flds[2];
		    if(flds.length > 3) {
			var usage = [];
			for(var j = 3; j < flds.length; ++j) {
			    if(/[^:]+:[^:]/.test(flds[j])) {
				var usages = flds[j].split(':');
				usage.push({"usage":usages[0].trim(),
					    "translation":usages[1].trim()})
			    }
			}
		    }
		    if(usage.length) item.usage = usage;
		}
		this.parent.db.push(item);
	    }
	}
    };
    f.onerror = function(e) {
	this.parent.Status = 0;
	this.parent.File = undefined;
	this.parent.FileSrc = undefined;
	this.parent.Modified = undefined;
    }
    return f;
};


// VocabUI: Object handling the GUI methods
var VocabUI = function(containerId) {
    if(!document.getElementById(containerId)) {
	var container = document.createElement("div");
	container.id = containerId;
	document.body.insertBefore(container, document.body.firstChild);
    }
    this.ContainerId = containerId;
};
var DEFFIELDS = { "Word/Phrase":"phrase", "Translation":"translation",
		  "Module":"module",
		  "Usage":function(item){
		      if(!item.hasOwnProperty("usage")) return "N/A";
		      var html = '<table>';
		      for(var u in item.usage) html += "<tr><td><i>" + item.usage[u].usage + "</i> : " + item.usage[u].translation + "</td></tr>";
		      html += '</table>';
		      return html;
		  }};
VocabUI.prototype.render = function(q){
    q = q || {};
    if(typeof q != "object") q = {"items":[]};
    //
    var init = q.hasOwnProperty("init") ? q.init : true;
    var html;
    if(!init) {
	// Initialise. Due to security constraints in web browsers, the DB
	//>file must be selected by the user in a file input form and not
	//>accessed directly. For this we display a popup form to request
	//>the file selection. All methods will check for the Loaded flag,
	//>which will be set after the file is selected.
	var popup = '<style type="text/css">';
	popup += "#filePopupCover { z-index:998;position:absolute;left:0;top:0;right:0;bottom:0;background-color:black;opacity:0.85; }\n";
	popup += "#filePopupWindow { z-index:999;position:absolute;left:25%;top:15%;right:25%;bottom:35%;background:white;opacity:1;padding:4px;min-width:400px;min-height:300px;border-radius:12px;line-height:1.5; font-family:Arial,sans-serif; }";
	popup += "#fileStatus { font-size:9pt;cursor:default; }";
	popup += "</style>";
	popup += '<div id="filePopup"><div id="filePopupCover"></div><div id="filePopupWindow"><h2>Select DB file</h2><input type="file" onchange="loadLocalFile(this);" /><span id="fileStatus"></span></div></div>';
	html = popup;
    }
    else {
	var module = q.hasOwnProperty("module") ? q.module : undefined;
	var filter = q.hasOwnProperty("filter") ? q.filter : undefined;
	var modlist = q.hasOwnProperty("modlist") ? q.modlist : {};
	var items = q.hasOwnProperty("items") ? q.items : [];
	var total = q.hasOwnProperty("total") ? q.total : "N/A";
	var fields = q.hasOwnProperty("fields") ? q.fields : DEFFIELDS;
	//
	html = '<style type="text/css">';
	html += "#modlist { float:left;padding:2px;width:96px;margin:2px; }\n";
	html += "#modlist>span { float:left;clear:both;cursor:pointer;margin:1px;padding:2px;font:9pt Arial,sans-serif; }\n";
	html += "#modlist>span.modselected { color:white;background-color:black;border-radius:5px;cursor:default; }\n";
	html += "#itemlist { float:left;padding:2px;margin:2px; }\n";
	html += "#itemlist>table>thead>tr>th { cursor:default;font-family:Arial,sans-serif;border-bottom:1px solid; padding:4px; }\n";
	html += "#itemlist>table>tbody>tr { font:10pt Arial,sans-serif; }\n";
	html += "#itemlist>table>tbody>tr>td { padding:2px; }\n";
	html += "#itemlist>table>tbody>tr:nth-child(even) { background:#eee; }\n";
	html += "#itemlist>table>tbody>tr:nth-child(odd) { background:#none; }\n";
	html += "#itemlist>table>tbody>tr>:last-child>* { visibility:hidden; }\n";
	html += "#itemlist>table>tbody>tr:hover { background:#ccc;  }\n";
	html += "#itemlist>table>tbody>tr:hover>:last-child>* { visibility:visible; }\n";
	html += "#itemlist>table>tbody>tr:hover>:last-child>img { cursor:pointer; }\n";
	html += "#addbtn { float:left;margin:5px;cursor:pointer; }\n";
	html += "#popup { display:none; }\n";
	html += "#popupCover { z-index:998;position:absolute;left:0;top:0;right:0;bottom:0;background-color:black;opacity:0.85; }\n";
	html += "#popupWindow { z-index:999;position:absolute;left:25%;top:15%;right:25%;bottom:35%;background:white;opacity:1;padding:4px;min-width:400px;min-height:300px;border-radius:12px;line-height:1.5; font-family:Arial,sans-serif; }";
	html += "#popupWindow label { vertical-align:top;float:left;clear:both; }\n";
	html += "#popupWindow input[type=text] { margin-left:8px;width:256px; }\n";
	html += "#popupWindow textarea { margin-left:8px;width:256px;height:72px; }\n";
	html += "#popupWindow span { font-size:8pt;float:left;clear:both; }\n";
	html += "#popupWindow button { float:right;margin-right:8px; }\n";
	html += "</style>";
	html += '<div id="modlist">';
	html += '<span' + (!module ? ' class="modselected"' : ' onclick="VocabApp.selectModule()"') + ' title="All">All ' + " (" + total + ')</span>';
	for(var m in modlist)
	    html += '<span' + (module == m ? ' class="modselected"' : ' onclick="VocabApp.selectModule(\'' + m + '\')"') + ' title="' + m + '">' + m + " (" + modlist[m] + ")</span>";
	html += "</div>";
	html += '<div id="itemlist">';
	html += '<table cellspacing=0><thead><tr>';
	for(var f in fields) {
	    if(f == "Module" && module) continue;
	    html += '<th>' + f + "</th>";
	}
	html += "<th></th></tr></thead><tbody>";
	for(var i in items) {
	    html += '<tr>';
	    for(var f in fields) {
		if(f == "Module" && module) continue;
		var formatter = (typeof fields[f] == 'function') ? fields[f] : function(item) { return item.hasOwnProperty(fields[f]) ? item[fields[f]] : "N/A"; };
		html += "<td>" + formatter(items[i].item) + "</td>";
	    }
	    html += '<td><img src="edit.png" alt="Edit" title="Edit" onclick="VocabApp.editItem(' + items[i].index + ')" /><img src="remove.png" alt="Delete" title="Delete" onclick="VocabApp.deleteItem(' + items[i].index + ')" /></td>';
	    html += "</tr>";
	}
	html += "</tbody></table></div>";
	html += '<img id="addbtn" src="add.png" alt="Add Item" title="Add Item" onclick="VocabApp.addItem();" />';
	html += '<div id="popup"><div id="popupCover" onclick="VocabApp.UI.hidePopup()"></div><div id="popupWindow">Test</div></div>';
    }
    document.getElementById(this.ContainerId).innerHTML = html;
};
VocabUI.prototype.showPopup = function(msg, data) {
    if(msg) {
	switch(msg) {
	case PopupType.AddForm:
	    msg = PopupForm.replace("%(formtitle)s", "Add Item");
	    for(var i in PopupFields) 
		msg = msg.replace("%(" + PopupFields[i] + ")s", "");
	    msg = msg.replace("%(index)s", "");
	    break;
	case PopupType.EditForm:
	    // Validate
	    if(!data) throw new ReferenceError();
	    if(!data.hasOwnProperty("index") || !data.hasOwnProperty("item"))
		throw new TypeError();
	    // Display
	    msg = PopupForm.replace("%(formtitle)s", "Edit Item");
	    for(var i in PopupFields) {
		var value = "", f = PopupFields[i];
		if(f == "usage")
		    for(var j in data.item[f])
			value += (value ? ",\n" : "") + data.item[f][j].usage + ":" + data.item[f][j].translation; 
		else value = data.item.hasOwnProperty(f) ? data.item[f] : "";
		msg = msg.replace("%(" + f + ")s", value);
	    }
	    msg = msg.replace("%(index)s", data.index);
	    break;
	}
	document.getElementById("popupWindow").innerHTML = msg;
    }
    document.getElementById("popup").style.display = "block";
};
VocabUI.prototype.hidePopup = function(msg) {
    document.getElementById("popup").style.display = "none";
};

var PopupType = { "AddForm":1, "EditForm":2 };
var PopupFields = [ 'phrase', 'translation', 'module', 'usage' ];
var PopupForm = '<h2>%(formtitle)s</h2><label>Word/Phrase:<input type="text" name="phrase" value="%(phrase)s" placeholder="Word/Phrase" /></label><br /><label>Translation:<input type="text" name="translation" value="%(translation)s" placeholder="Translation" /></label><label>Module:<input type="text" name="module" value="%(module)s" placeholder="Module" /></label><label>Usage:<textarea name="usage" placeholder="Usage">%(usage)s</textarea></label><span>Usage is a comma-separated list of column-separated tuples with the form [usage]:[translation] (you may add each on a lign for clarity).</span><button name="saveItem" onclick="VocabApp.saveItem(getPopupFormData())" data-index="%(index)s">Save</button><button onclick="VocabApp.UI.hidePopup()">Cancel</button>';
var getPopupFormData = function() {
    var form = {};
    for(var i in PopupFields) {
	form[PopupFields[i]] = document.querySelector("#popupWindow [name=" + PopupFields[i] + "]").value;
    }
    var idx = document.querySelector("#popupWindow [name=saveItem]").dataset.index;
    if(!form.phrase || !form.translation) {
	window.alert("Missing data");
	return false;
    }
    if(!form.module) delete form.module;
    var re = /([^:]+\s*:\s*[^:]+\s*,*\s*)+/;
    if(!form.usage) {
	VocabApp.UI.hidePopup();
	delete form.usage;
	return {"index":idx, "item":form};
    }
    if(!re.test(form.usage)) {
	alert("Invalid comma-separated list of column-separated tuples with the form [usage]:[translation] was provided");
	return false;
    }
    var usage = [], inputusage = form.usage.trim().trim(',').split(',');
    for(var i in inputusage) {
	if(inputusage[i]) {
	    var usageinstance = inputusage[i].trim().trim(':').split(':');
	    if(usageinstance.length >= 2)
		usage.push({"usage":usageinstance[0].trim(),
			    "translation":usageinstance[1].trim()});
	}
    }
    form.usage = usage;
    VocabApp.UI.hidePopup();
    return {"index":idx, "item":form};
};
// File loading functions
var loadLocalFile = function(input) {
    input.disabled = true;
    try {
	document.getElementById('fileStatus').innerHTML = "Loading file...";
	VocabApp.initialise(VocabApp.UI.ContainerId,
			    new LocalFileDbSrc(input.files[0]));
    }
    catch(e) {
	input.disabled = false;
    }
};

// VocabApp: Object handling the application
var VocabApp = {
    "initialise":function(containerId, dbsrc) {
	this.DB = new VocabDB(dbsrc || new SimulDbSrc())
	this.UI = new VocabUI(containerId);
	if(!this.DB.Status) this.UI.render({"init":false});
	else if(this.DB.Status < 2)
	    // Wait till DB is initialised
	    window.setTimeout(VocabApp.initialise, 500, containerId, dbsrc);
	else this.UI.render({"modlist":this.DB.Get({"mods":1}),
			     "items":this.DB.Get(),
			     "total":this.DB.Get().length });
	this.module = undefined;
    },
    "selectModule":function(modname) {
	if(modname) {
	    this.UI.render({"modlist":this.DB.Get({"mods":1}),
			    "module":modname,
			    "items":this.DB.Get({"module":modname}),
			    "total":this.DB.Get().length});
	    this.module = modname;
	}
	else {
	    this.UI.render({"modlist":this.DB.Get({"mods":1}),
			    "items":this.DB.Get(),
			    "total":this.DB.Get().length });
	    this.module = undefined;
	}
    },
    "addItem":function() { this.UI.showPopup(PopupType.AddForm); },
    "editItem":function(idx){
	var item = this.DB.Get({"index":idx});
	if(item)
	    this.UI.showPopup(PopupType.EditForm, {"index":idx, "item":item});
    },
    "saveItem":function(query) {
	if(query) {
	    this.DB.Set(query);
	    this.selectModule(this.module);
	}
    },
    "deleteItem":function(idx){
	if(window.confirm("Are you sure you want to delete this item?")) {
	    this.DB.Delete({"index":idx});
	    this.selectModule(this.module);
	    this.UI.showPopup("Item Deleted!");
	}
    }
};
