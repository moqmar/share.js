# share.js

A simple public file hosting application with protected upload and without any frontend. Just plain HTTP.

## Usage

`sharejs [--host <host>] [--port <port>] [--path <path>] [--prefix <prefix>]`

Start the server.

**host**: The host address to bind to  
**port**: The port to bind to  
**path**: The path to the data storage (where all files will be uploaded to)  
**prefix**: The domain prefix - with `--prefix https://example.org/` the server will return the URL `https://example.org/12345678`

---

`sharejs --key`

Just generate a random new upload key and print it to STDOUT.

## Upload

```http
POST /<uploadkey> HTTP/1.1
Content-Type: image/png

{ binary data }
```

```http
HTTP/1.1 200 OK

https://example.org/12345678
```

The `Filename` header can be e.g. set to `index.html` if you want the file to be downloadable and saved with a specific name.

## Upload using curl

```bash
# A plain text file
curl example.org --data-binary @example.txt
# An image
curl example.org -H Content-Type:image/png --data-binary @example.png
# A downloadable file
curl example.org -H Filename:invoice.png --data-binary @invoice.png
# STDIN
echo "Hello World" | curl example.org --data-binary @-
```

## Upload script for Bash

```bash
#!/bin/bash
ENDPOINT="example.org"
UPLOADKEY="8a1192cb1df3a3f630cd9ff87ec8bcaa2a0eabc3538e6cb822c8ab79a5f85bb5"
if [ $# -eq 0 ]; then
if [ ! -t 0 ]; then set -- -; else
    echo "Usage: share <file1> [file2] [...]" &&
    echo "       echo Hello World | share" && exit 1
fi; fi
for f in "$@"; do
    [ $# -gt 1 ] && echo -n "$f"": "
    [ "$f" != "-" ] && [ ! -e "$f" ] && echo "The file doesn't exist." ||
    curl $ENDPOINT/$UPLOADKEY -H "Content-Type: $([ "$f" != "-" ] && mimetype -bi $f)" --data-binary "@$f"
done
```

## Upload script for Bash (downloadable files only)

```bash
#!/bin/bash
ENDPOINT="example.org"
UPLOADKEY="8a1192cb1df3a3f630cd9ff87ec8bcaa2a0eabc3538e6cb822c8ab79a5f85bb5"
[ $# -eq 0 ] && echo "Usage: upload <file1> [file2] [...]" && exit 1
for f in "$@"; do
    [ $# -gt 1 ] && echo -n "$f"": "
    [ ! -e "$f" ] && echo "The file doesn't exist." ||
    curl $ENDPOINT/$UPLOADKEY -H "Filename: $f" -H "Content-Type: $(mimetype -bi $f)" --data-binary "@$f"
done
```
