// server.js
var express = require('express');
var path = require('path');
var serveStatic = require('serve-static');

// configure server
app = express();
app.use(serveStatic(__dirname + "/www"));

// url rewrite
app.get('*', function(request, response, next) {
    response.sendFile(__dirname + '/www/index.html')
});

var port = process.env.PORT || 5000;
app.listen(port);
console.log('server started '+ port);
