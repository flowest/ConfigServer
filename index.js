var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const dgram = require('dgram');
var net = require('net');
const kinectDataUdpSocket = dgram.createSocket('udp4');

//load .proto files generated from the client c# application
var protobuf = require('protocol-buffers');
var fs = require('fs');
var kinectData = protobuf(fs.readFileSync('KinectData.proto'));

//use this folder for static files, referenced in .html files for client
app.use(express.static('public'));

//module for file upload (.dat gesture file that is spread to kinect clients)
var multer = require('multer');
const gestureFileName = "gesture.dat";
const gestureDirectory = "./uploads/";
var multerStorageConfig = multer.memoryStorage();
var upload = multer({ storage: multerStorageConfig });

kinectDataUdpSocket.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});


//listening udp socket for kinect data
kinectDataUdpSocket.on('message', (msg, rinfo) => {
  //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var dataFromKinect = kinectData.KinectData.decode(msg);
  var dataForClient = {
    "kinectData": dataFromKinect,
    "sourceIP": rinfo.address
  };

  io.emit('kinect_update_data', dataForClient);
});

kinectDataUdpSocket.bind(1337);


//listening tcp socket for client programm
var connectedClients = [];
var tcp_server = net.createServer(function (socket) {

  connectedClients.push(socket);

  io.emit('tcp_client_connection_update', {
    status: "connect",
    ipv4Adress: IP6toIP4(socket.remoteAddress)
  });
  console.log("new client: " + socket.remoteAddress);

  socket.on('end', function () {
    removeClientFromList(this);
    console.log("ended connection");
  });

  socket.on('error', function (error) {
    //console.log(error);
    console.log("lost connection");
    removeClientFromList(this);
  });

  socket.on('data', function (data) {
    //console.log("tcp socket data " + data);
    io.emit('tcp_client_data', {
      ipv4Adress: IP6toIP4(socket.remoteAddress)
    });
  });
});

tcp_server.on('error', function (error) {
  console.log(error);
});

tcp_server.listen(8000, function () {
  console.log("tcp server listening");
});


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// app.get('/upload_dat', function (req, res) {
//   res.redirect('/');
// });

app.post('/upload_dat', upload.any(), function (req, res, next) {
  saveAndDistributeNewGestureFile(req.files[0].buffer);
  res.redirect('/');
});

// io.on('connection', function(socket){
//     io.emit('update_data', data);
// });

http.listen(3000, function () {
  console.log('http server listening on *:3000');
});


function checkIfFileExists(fileDirectory) {
  fs.stat(fileDirectory, function (err, stat) {
    if (err == null) {
      return true;
    } else if (err.code == 'ENOENT') {
      // file does not exist
      return false;
    } else {
      console.log('Some other error: ', err.code);
    }
  });
}

function removeClientFromList(socket) {
  connectedClients.splice(connectedClients.indexOf(socket), 1);
  io.emit('tcp_client_connection_update', {
    status: "disconnect",
    ipv4Adress: IP6toIP4(socket.remoteAddress)
  });
  console.log("client removed");
}

function saveAndDistributeNewGestureFile(buffer) {
  if (checkIfFileExists(gestureDirectory + gestureFileName) == true) {
    fs.unlinkSync(gestureDirectory + gestureFileName);
  }
  fs.writeFile(gestureDirectory + gestureFileName, buffer, function (err) {
    if (err == null) {
      broadcastFileToClient(buffer);
    }
  });
}

function broadcastFileToClient(buffer) {
  connectedClients.forEach(function (clientSocket) {
    clientSocket.write(buffer);
  });
}

function IP6toIP4(ip6Adress) {
  var ip6AdressParts = ip6Adress.split(':');
  return ip6AdressParts[ip6AdressParts.length - 1];
}