if (arg("key", true)) process.exit(console.log(require("crypto").randomBytes(32).toString("hex")) || 0);

const storage = (arg("path") || process.cwd()).replace(/\/$/, ""),
      e403 = "You're not allowed to upload files! 凸ಠ益ಠ)凸",
      e404 = "I dunno, seems like there's nothing here... ¯\\_(ツ)_/¯",
      e500 = "Oops... Something went wrong. Please try again in a minute. ✖_✖";

var http = require("http"),
    fs = require("fs"),
    sqlite = require("sqlite3");

var db = new sqlite.Database(storage + "/.sharejs.sqlite");
db.run("CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY NOT NULL, mime TEXT NOT NULL, filename TEXT NULL)");

if (!fs.existsSync(storage + "/.sharejs.keys")) {
    var key = require("crypto").randomBytes(32).toString("hex");
    fs.writeFileSync(storage + "/.sharejs.keys", key + "\n");
    console.log("Your upload key: " + key + "\n");
    console.log("To add another key:\n  sharejs --key | tee --append .sharejs.keys\n");
}
var keys = require("./livefile")(storage + "/.sharejs.keys");

function arg(name, bool) {
    if (bool) return process.argv.slice(2).indexOf((name.length == 1 ? "-" : "--") + name) > -1;
    else return process.argv[process.argv.slice(2).indexOf((name.length == 1 ? "-" : "--") + name) < 0 ? -1 : process.argv.slice(2).indexOf((name.length == 1 ? "-" : "--") + name) + 3];
}

function createID() {
    return new Promise(function(resolve, reject) {
        var s = "";
        for (var i = 0; i < 8; i++) s += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 62));
        fs.exists(storage + "/" + s, function(exists) {
            if (!exists) resolve(s);
            else resolve(createID());
        })
    })
}

function upload(mime, filename) {
    return createID().then(function(id) {
        db.run("INSERT INTO files VALUES (?, ?, ?)", id, mime, filename || null);
        return {
            id: id,
            mime: mime,
            filename: filename || null,
            stream: fs.createWriteStream(storage + "/" + id)
        }
    })
}

http.createServer(function(req, res) {
    res.setHeader("Server", "share.js");

    if (req.method == "POST") {
        if (keys.get().split("\n").map(x => x.trim()).filter(x => !x.match(/^#|^$/)).indexOf(req.url.replace(/^\/*/, "")) == -1) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.statusCode = 403;
                res.end(e403 + "\n");
                return;
        }
        var type = "text/plain; charset=utf-8";
        if (!(req.headers["content-type"]||"").trim().match(/^(multipart\/|example\/|application\/x-www-form-urlencoded|$)/)) {
            type = req.headers["content-type"].trim();
        }
        upload(type, req.headers["filename"]).then(function(u) {
            req.pipe(u.stream);
            req.on("end", function() {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.statusCode = 200;
                res.end((arg("prefix") || "") + u.id + "\n");
            });
        })
        return;
    }

    else if ((req.method == "GET" || req.method == "HEAD") && req.url.match(/^\/[a-zA-Z0-9]{8}\/?(?:$|\?)/)) {
        fs.stat(storage + "/" + req.url.substr(1, 8), function(err, stats) {
            if (err) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.statusCode = 404;
                res.end(e404 + "\n");
                return;
            }
            db.get("SELECT mime, filename FROM files WHERE id = ?", req.url.substr(1, 8), function(err, row) {
                if (err) {
                    console.error(err);
                    res.setHeader("Content-Type", "text/plain; charset=utf-8");
                    res.statusCode = 500;
                    res.end(e500 + "\n");
                    return;
                }
                res.setHeader("Accept-Ranges", "bytes");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "GET");
                res.setHeader("Cache-Control", "public max-age=31536000");
                res.setHeader("Expires", new Date(Date.now() + 31536000*1000).toUTCString());
                res.setHeader("Date", new Date(stats.birthtime.getTime() || stats.ctime.getTime()).toUTCString());
                res.setHeader("Content-Type", ((row || {}).filename) ?
                    "application/octet-stream" :
                    ((row || {}).mime || "text/plain; charset=utf-8"));
                if ((row || {}).filename) res.setHeader("Content-Disposition", "attachment; filename=" + row.filename);
                if (!req.headers["range"]) {
                    res.setHeader("Content-Length", stats.size);
                    res.statusCode = 200;
                    if (req.method == "GET") fs.createReadStream(storage + "/" + req.url.substr(1, 8)).pipe(res);
                    else res.end();
                } else {
                    var range = req.headers["range"].match(/^bytes=(\d+)-(\d*)$/);
                    if (!range || parseInt(range[1]) < 0 || parseInt(range[2] || stats.size - 1) >= stats.size) {
                        res.statusCode = 216;
                        res.end();
                        return;
                    }
                    var s = parseInt(range[1]),
                        e = parseInt(range[2] || stats.size - 1);
                    res.statusCode = 206;
                    res.setHeader("Content-Length", e - s + 1);
                    res.setHeader("Content-Range", "bytes " + s + "-" + e + "/" + stats.size);
                    if (req.method == "GET") fs.createReadStream(storage + "/" + req.url.substr(1, 8), {
                        start: s,
                        end: e
                    }).pipe(res);
                    else res.end();
                }
            });
        })
    }

    else {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.statusCode = 404;
        res.end(e404 + "\n");
    }
}).listen(parseInt(arg("port") || 8000), arg("host") || "::", function(err) {
    if (err) throw err;
    else console.log("share.js is listening on", (this.address().family == "IPv6" ? "[" + this.address().address + "]" : this.address().address) + ":" + this.address().port);
});
