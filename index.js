var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const dgram = require('dgram');
var net = require('net');
const kinectDataUdpSocket = dgram.createSocket('udp4');

var fs = require('fs');


//load the proto files
var protobuf = require('protobufjs');
var KinectData = null;
protobuf.load("proto_files/KinectData.proto", function (err, root) {
  if (err) {
    throw err;
  }
  KinectData = root.lookupType("BodyDataClient.KinectData");
});

var TcpData = null;
protobuf.load("proto_files/TcpData.proto", function (err, root) {
  if (err) {
    throw err;
  }
  TcpData = root.lookupType("BodyDataClient.TcpData");
});


//use this folder for static files, referenced in .html files for client
app.use(express.static('public'));

//module for file upload (.dat gesture file that is spread to kinect clients)
var multer = require('multer');
const GESTURE_DIRECTORY = "./uploads/";
var multerStorageConfig = multer.memoryStorage();
var upload = multer({ storage: multerStorageConfig });


kinectDataUdpSocket.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});


//listening udp socket for kinect data
kinectDataUdpSocket.on('message', (msg, rinfo) => {
  //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var dataFromKinect = KinectData.decode(msg);
  var dataForClient = {
    "kinectData": dataFromKinect,
    "sourceIP": rinfo.address,
  };

  io.emit('kinect_update_data', dataForClient);
});

kinectDataUdpSocket.bind(1337);


//listening tcp socket for client programm
var connectedClients = [];
var tcp_server = net.createServer(function (tcpSocket) {

  connectedClients.push(tcpSocket);

  var payload = {
    dataType: "GestureFilesSync",
    gestureFilesOnServer: { files: fs.readdirSync(GESTURE_DIRECTORY) }
  }

  broadcastTcpDataToClients(payload);

  io.emit('tcp_client_connection_update', {
    status: "connect",
    ipv4Adress: IP6toIP4(tcpSocket.remoteAddress)
  });
  console.log("new client: " + tcpSocket.remoteAddress);

  tcpSocket.on('end', function () {
    removeClientFromList(this);
    console.log("ended connection");
  });

  tcpSocket.on('error', function (error) {
    //console.log(error);
    console.log("lost connection");
    removeClientFromList(this);
  });

  tcpSocket.on('data', function (data) {
    var tcp_data = TcpData.decode(data);

    if (tcp_data.dataType == "AliveSignal") {
      io.emit('tcp_client_data', {
        ipv4Adress: IP6toIP4(tcpSocket.remoteAddress)
      });
    }
    else if (tcp_data.dataType == "DownloadMissingGestureFilesRequest") {
      var missingFiles = tcp_data.missingFiles.files;
      missingFiles.forEach(missingFile => {
        var fileBuffer = fs.readFileSync(GESTURE_DIRECTORY + missingFile);
        var jochen = tcpSocket;

        sendMissingGestureFileToClient(fileBuffer,missingFile,tcpSocket)
      })
    }
  });
});

tcp_server.on('error', function (error) {
  console.log(error);
});

tcp_server.listen(8000, function () {
  console.log("tcp server listening");
});

io.on('connection', function (socket) {

  socket.on("test_sending", function (data) {
    console.log(data);

    var payload = {
      dataType: 'AliveSignal',
      aliveSignal: { message: 'Hello form node!' }
    };

    var err = TcpData.verify(payload);
    if (err)
      throw Error(err)

    var buffer = TcpData.encode(payload).finish();

    var test = TcpData.decode(buffer);

    broadcastTcpDataToClients(buffer);
  });

  socket.on('get_gesture_files', function (data) {
    io.emit('saved_gesture_files', loadGestureFiles());
  });

  socket.on('remove_gesture_file', function (gestureFileName) {
    removeGestureFile(gestureFileName);
  });

  socket.on('untrack_gesture_file', function (gestureFileName) {
    untrackGestureFile(gestureFileName);
  });

  socket.on('track_gesture_file', function (gestureFileName) {
    trackGestureFile(gestureFileName);
  });
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// app.get('/upload_dat', function (req, res) {
//   res.redirect('/');
// });

app.post('/upload_dat', upload.any(), function (req, res, next) {
  saveAndDistributeNewGestureFile(req.files[0].buffer, req.files[0].originalname);
  res.redirect('/');
  io.emit('saved_gesture_files', loadGestureFiles());
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

function saveAndDistributeNewGestureFile(buffer, gestureFileName) {
  if (checkIfFileExists(GESTURE_DIRECTORY + gestureFileName) == true) {
    fs.unlinkSync(GESTURE_DIRECTORY + gestureFileName);
  }
  fs.writeFile(GESTURE_DIRECTORY + gestureFileName, buffer, function (err) {
    if (err == null) {

      var payload = {
        dataType: 'NewGestureFile',
        gestureFile: {
          gestureFileBuffer: buffer,
          fileName: gestureFileName
        }
      }
      broadcastTcpDataToClients(payload);
    }
  });
}

function broadcastTcpDataToClients(payload) {

  var err = TcpData.verify(payload);
  if (err)
    throw Error(err)

  var protoBuffer = TcpData.encode(payload).finish();

  connectedClients.forEach(function (clientSocket) {
    clientSocket.write(protoBuffer);
  });
}

function IP6toIP4(ip6Adress) {
  var ip6AdressParts = ip6Adress.split(':');
  return ip6AdressParts[ip6AdressParts.length - 1];
}

function loadGestureFiles() {
  return fs.readdirSync(GESTURE_DIRECTORY);
}

function removeGestureFile(gestureFileName) {
  var payload = {
    dataType: 'RemoveGestureFile',
    gestureFileNameForAction: gestureFileName
  };

  broadcastTcpDataToClients(payload);
  fs.unlinkSync(GESTURE_DIRECTORY + "/" + gestureFileName);
  io.emit('saved_gesture_files', loadGestureFiles());
}

function untrackGestureFile(gestureFileName) {
  var payload = {
    dataType: 'UntrackGestureFile',
    gestureFileNameForAction: gestureFileName
  };

  broadcastTcpDataToClients(payload);
}

function trackGestureFile(gestureFileName) {
  var payload = {
    dataType: 'TrackGestureFile',
    gestureFileNameForAction: gestureFileName
  };

  broadcastTcpDataToClients(payload);
}

function sendMissingGestureFileToClient(fileBuffer, gestureFileName, clientSocket) {
  var payload = {
    dataType: 'NewGestureFile',
    gestureFile: {
      gestureFileBuffer: fileBuffer,
      fileName: gestureFileName
    }
  }

  var err = TcpData.verify(payload);
  if (err)
    throw Error(err)

  var protoBuffer = TcpData.encode(payload).finish();
  clientSocket.write(protoBuffer);
}