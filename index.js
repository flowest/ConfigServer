const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const dgram = require('dgram');
const net = require('net');
const kinectDataUdpSocket = dgram.createSocket('udp4');

const fs = require('fs');

const kinectClients = require("./server_scripts/kinect_clients");
kinectClients.init(io);

const gestureFiles = require("./server_scripts/gesture_files");
gestureFiles.init(io);

const room = require("./server_scripts/room");
room.init(io);

const math = require("./server_scripts/calculation");



//load the proto files
const protobuf = require('protobufjs');
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
const multer = require('multer');
const GESTURE_DIRECTORY = "./uploads/";
const multerStorageConfig = multer.memoryStorage();
const upload = multer({ storage: multerStorageConfig });


kinectDataUdpSocket.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});


//listening udp socket for kinect data
kinectDataUdpSocket.on('message', (msg, rinfo) => {
  //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var dataFromKinect = KinectData.decode(msg);
  let kinectID = rinfo.address.split('.')[3];
  let translation = math.translate(dataFromKinect.trackedBodies, kinectID);
  var dataForClient = {
    "kinectData": dataFromKinect,
    "sourceIP": rinfo.address,
    "ID": kinectID,
    "translatedPositions": translation.translatedPositions,
    "kinectPosition": translation.kinectPosition,
    "trackingBodiesCount" : dataFromKinect.trackedBodies.length
  };

  io.emit('kinect_update_data', dataForClient);
});

kinectDataUdpSocket.bind(1337);


//listening tcp socket for client programm
var tcp_server = net.createServer(function (tcpSocket) {

  kinectClients.addClient(tcpSocket);

  var payload = {
    dataType: "GestureFilesSync",
    gestureFilesOnServer: { files: fs.readdirSync(GESTURE_DIRECTORY) }
  }

  kinectClients.broadcastTcpDataToClients(payload);

  let ip4Adress = kinectClients.IP6toIP4(tcpSocket.remoteAddress);

  io.emit('tcp_client_connection_update', {
    status: "connect",
    ipv4Adress: ip4Adress,
    ID: ip4Adress.split('.')[3]
  });
  console.log("new client: " + tcpSocket.remoteAddress);

  tcpSocket.on('end', function () {
    kinectClients.removeClientFromList(this);
    console.log("ended connection");
  });

  tcpSocket.on('error', function (error) {
    //console.log(error);
    console.log("lost connection");
    kinectClients.removeClientFromList(this);
  });

  tcpSocket.on('data', function (data) {
    var tcp_data = TcpData.decode(data);

    if (tcp_data.dataType == "AliveSignal") {
      io.emit('tcp_client_data', {
        ipv4Adress: kinectClients.IP6toIP4(tcpSocket.remoteAddress)
      });
    }
    else if (tcp_data.dataType == "DownloadMissingGestureFilesRequest") {
      var missingFiles = tcp_data.missingFiles.files;
      missingFiles.forEach(missingFile => {
        var fileBuffer = fs.readFileSync(GESTURE_DIRECTORY + missingFile);
        var jochen = tcpSocket;

        gestureFiles.sendMissingGestureFileToClient(fileBuffer, missingFile, tcpSocket)
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
    //console.log(data);

    console.log(math.translate(data.positionVector));

  });

  socket.on('get_gesture_files', function (data) {
    io.emit('saved_gesture_files', gestureFiles.loadGestureFiles());
  });

  socket.on('remove_gesture_file', function (gestureFileName) {
    gestureFiles.removeGestureFile(gestureFileName);
  });

  socket.on('untrack_gesture_file', function (gestureFileName) {
    gestureFiles.untrackGestureFile(gestureFileName);
  });

  socket.on('track_gesture_file', function (gestureFileName) {
    gestureFiles.trackGestureFile(gestureFileName);
  });

  socket.on('get_room_settings', function () {
    room.sendRoomSettingsToClient();
  });

  socket.on('update_room_settings', function (newSettings) {
    room.updateRoomSettings(newSettings);
    room.sendRoomSettingsToClient();
    console.log("updated room settings");
  });

  socket.on('get_kinect_settings', function () {
    room.sendKinectSettingsToClient();
  });

  socket.on('update_kinect_setting', function (newSettings) {
    room.updateKinectSettings(newSettings);
    room.sendKinectSettingsToClient();
    console.log("updated kinect settings" + newSettings.fileName);
  });

  socket.on('new_kinect_setting', function (newSettings) {
    room.updateKinectSettings(newSettings);
    room.sendKinectSettingsToClient();
    console.log("added new kinect settings" + newSettings.fileName);
  });

  socket.on('delete_kinect_settings', function (fileName) {
    room.deleteKinectSettings(fileName);
    room.sendKinectSettingsToClient();
    console.log("removed " + fileName);
  })
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
  io.emit('saved_gesture_files', gestureFiles.loadGestureFiles());
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
      kinectClients.broadcastTcpDataToClients(payload);
    }
  });
}