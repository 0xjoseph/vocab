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
		 usage:[{usage:"Ik ben", translation:"I am"}]} ];
};
// Implements IDbSrc
SimulDbSrc.prototype = Object.create(IDbSrc.prototype);
SimulDbSrc.prototype.get = function(q){
    q = q || {};
    if(typeof q != "object") q = {"filter":q.toString()};
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

// LocalFileDbSrc: Object abstracting and wrapping operations for a local file
//>with a special format acting as a database.
// Constructor
var LocalFileDbSrc = function(params) {};
// Implements IDbSrc
LocalFileDbSrc.prototype = Object.create(IDbSrc.prototype);
LocalFileDbSrc.prototype.get = function(q){};
LocalFileDbSrc.prototype.set = function(q){};
LocalFileDbSrc.prototype.del = function(q){};

// VocabUI: Object handling the GUI methods
var VocabUI = function(params) {};
VocabUI.prototype.render = function(params){};

// VocabApp: Object handling the application
var VocabApp = function() {
    this.DataSource = new SimulDbSrc();
    this.UI = new VocabUI;
}
VocabApp.prototype.initialise = function(){};
VocabApp.prototype.display = function(params){};
