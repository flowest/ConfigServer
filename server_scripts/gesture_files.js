var protobuf = require('protobufjs');
var fs = require('fs');

var TcpData = null;
protobuf.load("proto_files/TcpData.proto", function (err, root) {
    if (err) {
        throw err;
    }
    TcpData = root.lookupType("BodyDataClient.TcpData");
});

const kinectClients = require("./kinect_clients");

var ioSocket;
const GESTURE_DIRECTORY = "./uploads/";

module.exports = {

    init: function (io) {
        ioSocket = io;
    },

    loadGestureFiles: function () {
        return fs.readdirSync(GESTURE_DIRECTORY);
    },

    removeGestureFile: function (gestureFileName) {
        var payload = {
            dataType: 'RemoveGestureFile',
            gestureFileNameForAction: gestureFileName
        };

        kinectClients.broadcastTcpDataToClients(payload);
        fs.unlinkSync(GESTURE_DIRECTORY + "/" + gestureFileName);
        ioSocket.emit('saved_gesture_files', this.loadGestureFiles());
    },

    untrackGestureFile: function (gestureFileName) {
        var payload = {
            dataType: 'UntrackGestureFile',
            gestureFileNameForAction: gestureFileName
        };

        kinectClients.broadcastTcpDataToClients(payload);
    },

    trackGestureFile: function (gestureFileName) {
        var payload = {
            dataType: 'TrackGestureFile',
            gestureFileNameForAction: gestureFileName
        };

        kinectClients.broadcastTcpDataToClients(payload);
    },

    sendMissingGestureFileToClient: function (fileBuffer, gestureFileName, clientSocket) {
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


}