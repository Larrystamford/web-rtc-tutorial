// initialize express
var express = require('express');
const fs = require('fs');

var app = express();
// create express peer server
var ExpressPeerServer = require('peer').ExpressPeerServer;

var options = {
    debug: true
}

// create a https server instance to listen to request
const https = require('https')
const server = https.createServer({
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
}, app)

// CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// peerjs is the path that the peerjs server will be connected to.
app.use('/', ExpressPeerServer(server, options));
// Now listen to your ip and port.
server.listen(9000, "10.231.254.227");
