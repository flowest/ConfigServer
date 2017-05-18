const fs = require('fs');

const PATH_TO_ROOMSETTINGS = "./room_settings/room.json";
const PATH_TO_KINECTSETTINGS = "./room_settings/kinect_config/";

var ioSocket;
var roomSettings = JSON.parse(fs.readFileSync(PATH_TO_ROOMSETTINGS, "utf8"));
var kinectConfigFiles = loadKinectConfigFiles();

function loadKinectConfigFiles() {
    var files = [];
    fs.readdirSync(PATH_TO_KINECTSETTINGS).forEach(file => {
        var config = {
            name: file,
            content: JSON.parse(fs.readFileSync(PATH_TO_KINECTSETTINGS + file, "utf8"))
        };
        files.push(config);
    });

    return files;
}

module.exports = {

    kinectConfigFiles: kinectConfigFiles,

    loadKinectConfigFiles: loadKinectConfigFiles,

    init: function (io) {
        ioSocket = io;
    },

    sendRoomSettingsToClient: function () {
        ioSocket.emit('send_room_settings', {
            width: roomSettings.width,
            length: roomSettings.length
        });
    },

    updateRoomSettings: function (newSettings) {
        roomSettings = newSettings;
        fs.writeFileSync(PATH_TO_ROOMSETTINGS, JSON.stringify(newSettings), "utf8");
    },

    sendKinectSettingsToClient: function () {
        ioSocket.emit('send_kinect_settings', loadKinectConfigFiles())
    },

    updateKinectSettings: function (newSettings) {
        var settings = {
            position: {
                x: newSettings.newXPos,
                y: newSettings.newYPos
            },
            rotation: newSettings.newRotation
        };

        fs.writeFileSync(PATH_TO_KINECTSETTINGS + newSettings.fileName, JSON.stringify(settings), "utf8");
    },

    deleteKinectSettings: function (fileName) {
        fs.unlinkSync(PATH_TO_KINECTSETTINGS + "/" + fileName);
    }

}