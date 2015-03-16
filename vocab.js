// vocab.js

// VocabDB: Object abstracting db operations
var VocabDB = function(dbsrc) {
    if(!dbsrc) throw new ReferenceError()
    if(!(dbsrc instanceof IDbSrc))
	throw new TypeError("dbsrc does not implement IDbSrc");
    this.DB = dbsrc;
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

// IDbSrc: Interface to be implemented by a database source
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
    var querydb = [];
    for(var i in this.db)
	if((!module || this.db[i].module == module) && (!filter || this.db[i].phrase.toLowerCase().indexOf(filter.toLowerCase()) >= 0 || this.db[i].translation.toLowerCase().indexOf(filter.toLowerCase()) >= 0))
	    querydb.push({"index":i, "item":this.db[i]});
    return querydb;
};
SimulDbSrc.prototype.set = function(q){
    if(!q || typeof q != "object") throw new TypeError();
    var index = q.hasOwnProperty("index") ? q.index : undefined;
    var item = q.hasOwnProperty("item") ? q.item : undefined;
    if(!item || typeof item != "object") throw new Error();
    // No validation on the item
    if(index && index < this.db.length)
	for(prop in item) this.db[index][prop] = item[prop];
    else this.db.push(item);
};
SimulDbSrc.prototype.del = function(q){
    if(!q || typeof q != "object") throw new TypeError();
    var index = q.hasOwnProperty("index") ? q.index : undefined;
    if(index && index < this.db.length) this.db.splice(index, 1);
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
var LocalFileDbSrc = function(params) {};
// Implements IDbSrc
LocalFileDbSrc.prototype = Object.create(IDbSrc.prototype);
LocalFileDbSrc.prototype.get = function(q){};
LocalFileDbSrc.prototype.set = function(q){};
LocalFileDbSrc.prototype.del = function(q){};
// ExtendsIDbSrc
LocalFileDbSrc.prototype.getmods = function(){};

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
    var module = q.hasOwnProperty("module") ? q.module : undefined;
    var filter = q.hasOwnProperty("filter") ? q.filter : undefined;
    var modlist = q.hasOwnProperty("modlist") ? q.modlist : {};
    var items = q.hasOwnProperty("items") ? q.items : [];
    var total = q.hasOwnProperty("total") ? q.total : "N/A";
    var fields = q.hasOwnProperty("fields") ? q.fields : DEFFIELDS;
    //
    var html = '<style type="text/css">';
    html += "#modlist { float:left;padding:2px;width:96px;margin:2px; }\n";
    html += "#modlist>span { float:left;clear:both;cursor:default;margin:1px;padding:2px;font:9pt Arial,sans-serif; }\n";
    html += "#modlist>span.modselected { color:white;background-color:black;border-radius:5px; }\n";
    html += "#itemlist { float:left;padding:2px;margin:2px; }\n";
    html += "#itemlist>table>thead>tr>th { cursor:default;font-family:Arial,sans-serif;border-bottom:1px solid; padding:4px; }\n";
    html += "#itemlist>table>tbody>tr { font:10pt Arial,sans-serif; }\n";
    html += "#itemlist>table>tbody>tr>td { padding:2px; }\n";
    html += "#itemlist>table>tbody>tr:nth-child(even) { background:#eee; }\n";
    html += "#itemlist>table>tbody>tr:nth-child(odd) { background:#none; }\n";
    html += "#itemlist>table>tbody>tr>:last-child { visibility:hidden; }\n";
    html += "#itemlist>table>tbody>tr:hover>:last-child { visibility:visible; }\n";
    html += "#addbtn { float:left;margin:5px;cursor:pointer; }\n";
    html += "</style>";
    html += '<div id="modlist">';
    html += '<span' + (!module ? ' class="modselected"' : "") + '>All ' + " (" + total + ')</span>';
    for(var m in modlist)
	html += '<span' + (module == m ? ' class="modselected"' : "") + '>' + m + " (" + modlist[m] + ")</span>";
    html += "</div>";
    html += '<div id="itemlist">';
    html += '<table cellspacing=0><thead><tr>';
    for(var f in fields) html += '<th>' + f + "</th>";
    html += "<td></td></tr></thead><tbody>";
    for(var i in items) {
	html += '<tr>';
	for(var f in fields) {
	    var formatter = (typeof fields[f] == 'function') ? fields[f] : function(item) { return item.hasOwnProperty(fields[f]) ? item[fields[f]] : "N/A"; };
	    html += "<td>" + formatter(items[i].item) + "</td>";
	}
	html += '<td><img src="edit.png" /><img src="remove.png" /></td>';
	html += "</tr>";
    }
    html += "</tbody></table></div>";
    html += '<img id="addbtn" src="add.png" alt="Add Item" title="Add Item" onclick="VocabApp.addItem()" />';
    document.getElementById(this.ContainerId).innerHTML = html;
};

// VocabApp: Object handling the application
var VocabApp = {
    "initialise":function(containerId, dbsrc) {
	this.DB = new VocabDB(dbsrc || new SimulDbSrc())
	this.UI = new VocabUI(containerId);
	this.UI.render({"modlist":this.DB.Get({"mods":1}),
			"items":this.DB.Get(),
			"total":this.DB.Get().length });
    },
    "addItem":function(params) {
	window.alert("Add Item");
    },
    "editItem":function(params){},
    "deleteItem":function(params){}
};
