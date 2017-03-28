var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const dgram = require('dgram');
const udp_socket = dgram.createSocket('udp4');

var protobuf = require('protocol-buffers');
var fs = require('fs');
var kinectData = protobuf(fs.readFileSync('KinectData.proto'));

app.use(express.static('public'));

var multer = require('multer');
const gestureFileName = "gesture.dat";
const gestureDirectory = "./uploads/"
var multerStorageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, gestureDirectory);
  },
  filename: function (req, file, cb) {
    if (checkIfFileExists(gestureDirectory + gestureFileName) == true) {
      fs.unlinkSync(gestureDirectory + gestureFileName);
    }
    cb(null, gestureFileName);
    console.log("file sucessfully uploaded");
    
  }
})
var upload = multer({ storage: multerStorageConfig });

udp_socket.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

udp_socket.on('message', (msg, rinfo) => {
  //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var dataFromKinect = kinectData.KinectData.decode(msg);
  var dataForClient = {
    "kinectData": dataFromKinect,
    "sourceIP": rinfo.address
  };

  io.emit('update_data', dataForClient);
});

udp_socket.bind(1337);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// app.get('/upload_dat', function (req, res) {
//   res.redirect('/');
// });

app.post('/upload_dat', upload.any(), function (req, res, next) {
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