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
IDbSrc.prototype.get = function(q){};
IDbSrc.prototype.set = function(q){};
IDbSrc.prototype.del = function(q){};
