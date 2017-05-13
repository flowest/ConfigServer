var ioSocket;
const protobuf = require('protobufjs');

var TcpData = null;
protobuf.load("proto_files/TcpData.proto", function (err, root) {
    if (err) {
        throw err;
    }
    TcpData = root.lookupType("BodyDataClient.TcpData");
});

connectedClients = [];

module.exports = {
    init: function (io) {
        ioSocket = io;
    },

    broadcastTcpDataToClients: function (payload) {

        var err = TcpData.verify(payload);
        if (err)
            throw Error(err)

        var protoBuffer = TcpData.encode(payload).finish();

        connectedClients.forEach(function (clientSocket) {
            clientSocket.write(protoBuffer);
        });
    },

    addClient: function (socket) {
        connectedClients.push(socket);
    },

    removeClientFromList: function (socket) {
        connectedClients.splice(connectedClients.indexOf(socket), 1);
        ioSocket.emit('tcp_client_connection_update', {
            status: "disconnect",
            ipv4Adress: this.IP6toIP4(socket.remoteAddress)
        });
        console.log("client removed");
    },

    IP6toIP4: function (ip6Adress) {
        var ip6AdressParts = ip6Adress.split(':');
        return ip6AdressParts[ip6AdressParts.length - 1];
    }
}