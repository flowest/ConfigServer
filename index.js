var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const dgram = require('dgram');
const udp_socket = dgram.createSocket('udp4');

var protobuf = require('protocol-buffers');
var fs = require('fs')
var kinectData = protobuf(fs.readFileSync('KinectData.proto'))

var data;

udp_socket.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

udp_socket.on('message', (msg, rinfo) => {
   //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
   var data = kinectData.KinectData.decode(msg);
    io.emit('update_data', data);
});

udp_socket.bind(1337);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// io.on('connection', function(socket){
//     io.emit('update_data', data);
// });

http.listen(3000, function(){
  console.log('listening on *:3000');
});