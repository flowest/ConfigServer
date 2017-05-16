const fs = require('fs');

const PATH_TO_ROOMSETTINGS = "./room_settings/room.json";

var ioSocket;
var roomSettings = JSON.parse(fs.readFileSync(PATH_TO_ROOMSETTINGS, "utf8"));

module.exports = {

    init: function (io) {
        ioSocket = io;
    },

    sendRoomSettingsToClient: function () {
        ioSocket.emit('send_room_settings', {
            width: roomSettings.width,
            length: roomSettings.length
        });
    },

    updateRoomSettings(newSettings) {
        roomSettings = newSettings;
        fs.writeFileSync(PATH_TO_ROOMSETTINGS, JSON.stringify(newSettings), "utf8");
    }

}