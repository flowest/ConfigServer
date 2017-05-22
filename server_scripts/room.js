const fs = require('fs');

const PATH_TO_ROOMSETTINGS = "./room_settings/room.json";
const PATH_TO_KINECTSETTINGS = "./room_settings/kinect_config/";

var ioSocket;
var roomSettings = JSON.parse(fs.readFileSync(PATH_TO_ROOMSETTINGS, "utf8"));


module.exports = {

    kinectConfigFiles: undefined,

    loadKinectConfigFiles: function () {
        var files = [];
        fs.readdirSync(PATH_TO_KINECTSETTINGS).forEach(file => {
            var config = {
                name: file,
                content: JSON.parse(fs.readFileSync(PATH_TO_KINECTSETTINGS + file, "utf8"))
            };
            files.push(config);
        });

        this.kinectConfigFiles = files;
    },

    init: function (io) {
        ioSocket = io;
        this.loadKinectConfigFiles();
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
        ioSocket.emit('send_kinect_settings', this.kinectConfigFiles)
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
        this.loadKinectConfigFiles();
    },

    deleteKinectSettings: function (fileName) {
        fs.unlinkSync(PATH_TO_KINECTSETTINGS + "/" + fileName);
        this.loadKinectConfigFiles();
    }

}