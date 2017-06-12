var ioSocket;
const fs = require('fs');

const PATH_TO_OSCCLIENTS_FILE = "./osc_clients.json";
var oscClients;

const OscEmitter = require('osc-emitter')
    , oscEmitter = new OscEmitter();

module.exports = {
    init: function (io) {
        ioSocket = io;
        oscClients = JSON.parse(fs.readFileSync(PATH_TO_OSCCLIENTS_FILE, "utf8"));
    },

    oscEmitter: oscEmitter,

    addOscClient: function (clientData) {

        oscEmitter.add(clientData.ipAddr, clientData.port);

        oscClients.clients.push(clientData);
        fs.writeFileSync(PATH_TO_OSCCLIENTS_FILE, JSON.stringify(oscClients), "utf8");
        this.sendOscClients();
    },

    removeOscClient: function (clientData) {

        oscEmitter.remove(clientData.ipAddr, clientData.port);


        oscClients.clients.forEach(function (element, index) {
            if (element["ipAddr"] === clientData.ipAddr && element["port"] === clientData.port) {
                oscClients.clients.splice(index, 1);
            }
        });
        fs.writeFileSync(PATH_TO_OSCCLIENTS_FILE, JSON.stringify(oscClients), "utf8");
        this.sendOscClients();
    },

    sendOscClients: function () {
        ioSocket.emit("send_osc_clients", oscClients.clients);
    }
}