#!/usr/bin/env node
var http = require("http");

function start() {
  var port = process.env.PORT || CONFIG.port;
  http.createServer(function(request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Running");
    response.end();
  }).listen(port);
  console.log("server has started");
}

exports.start = start;
