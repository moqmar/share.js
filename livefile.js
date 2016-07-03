var fs = require("fs");
module.exports = function(file) {
    var o = {
        _filename: file,
        _content: fs.readFileSync(file),
        _watcher: function(event) {
            fs.readFile(this._filename, function(error, content) {
                if (!error) this._content = content;
                else console.error(error);
            }.bind(this));
        },
        get: function() {
            return this._content.toString();
        }
    };
    fs.watch(file, o._watcher);
    return o;
}