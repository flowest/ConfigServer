
var socket = io();

$(function () {

    const UDP_DISCONNECT_TIMEOUT_MILLISECONDS = 1000;
    const TCP_DISCONNECT_TIMEOUT_MILLISECONDS = 10000;

    socket.emit('get_room_settings');

    socket.on('send_room_settings', function (roomSettings) {
        $('#save-room-settings-btn').removeAttr("disabled");

        $("#room-width").val(roomSettings.width);
        $("#room-length").val(roomSettings.length);

        $("#room").css({ width: roomSettings.width + 'px', height: roomSettings.length + 'px' });
    });

    socket.on('saved_gesture_files', function (gestureFiles) {

        var list = document.getElementById('currentTrackingGestures');
        list.innerHTML = "";
        gestureFiles.forEach(file => {
            list.innerHTML += '<p class="list-group-item gestureFile">' + file
                + '<button class="btn btn-danger pull-right deleteGestureButton" onclick="deleteGestureFile(\'' + file + '\');" type="button">Delete</button>'
                + '<button class="btn btn-warning pull-right deleteGestureButton" onclick="untrackGestureFile(\'' + file + '\');" type="button">Untrack</button>'
                + '<button class="btn btn-success pull-right deleteGestureButton" onclick="trackGestureFile(\'' + file + '\');" type="button">Track</button>'
                + '</p> ';
        });
    });

    socket.on('kinect_update_data', function (data) {

        clearNoUdpKinectDataReceivedTimer(data.ID);

        if (data.kinectData.isTrackingBody == true) {
            $('#kinectData #kinect' + data.ID + ' .kinectStatus').addClass('success');
            $('#kinectData #kinect' + data.ID + ' .kinectStatus').removeClass('danger');
            $('#kinectData #kinect' + data.ID + ' .kinectTrackingData').text("[" + data.kinectData.positionTracked.x + ", " + data.kinectData.positionTracked.y + ", " + data.kinectData.positionTracked.z + "]");
        }
        else {
            $('#kinectData #kinect' + data.ID + ' .kinectStatus').removeClass('success');
            $('#kinectData #kinect' + data.ID + ' .kinectStatus').addClass('danger');
            $('#kinectData #kinect' + data.ID + ' .kinectTrackingData').text("---no body tracked---");
        }
        $('#kinectData #kinect' + data.ID + ' .sourceIP').text(data.sourceIP);
        $('#kinectData #kinect' + data.ID).attr("source", data.sourceIP);
        if (data.kinectData.trackingGestureNames) {
            $('#kinectData #kinect' + data.ID + ' .trackingGestures').text(JSON.stringify(data.kinectData.trackingGestureNames));
        }
        else {
            $('#kinectData #kinect' + data.ID + ' .trackingGestures').text("no gestures in use");
        }


        startNoUdpKinectDataReceivedTimer(data.ID);

        if (data.kinectData.isTrackingBody) {
            $('.person').css({ display: 'block' });
            $('.person').css({ top: data.kinectData.positionTracked.z * 100 + 'px', left:data.kinectData.positionTracked.x * 100 + 'px' });

            $('.person .person-label').html(data.ID);
        }
        else {
            // $('.person').css({ display: 'none' });
        }

        //test code
        if (data.kinectData.isTrackingBody && data.kinectData.trackedGesture != "") {
            //alert(data.kinectData.trackedGesture);
            $('#kinectData #kinect' + data.ID + ' .trackingGesturePosition').text("[" + data.kinectData.positionGestureTracked.x + ", " + data.kinectData.positionGestureTracked.y + ", " + data.kinectData.positionGestureTracked.z + "]");
        }
    });



    socket.on('tcp_client_connection_update', function (tcpClientData) {
        if (tcpClientData.status == "disconnect") {
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').removeClass('success');
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').addClass('danger');

            removeKinectFromTable(tcpClientData.ipv4Adress);
        }
        else if (tcpClientData.status == "connect") {
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').removeClass('danger');
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').addClass('success');

            addKinectToTable(tcpClientData.ID, tcpClientData.ipv4Adress);
        }
    });

    socket.on('tcp_client_data', function (tcpClientData) {

        if ($('tr[source="' + tcpClientData.ipv4Adress + '"]').length == 0) {
            addKinectToTable(tcpClientData.ipv4Adress.split('.')[3], tcpClientData.ipv4Adress);
        }

        clearNoTcpDataReceivedTimer(tcpClientData.ipv4Adress);

        $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').removeClass('danger');
        $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').addClass('success');

        startNoTcpDataReceivedTimer(tcpClientData.ipv4Adress);
    });

    var noUdpDataReceivedTimer = [];

    function startNoUdpKinectDataReceivedTimer(kinectID) {
        noUdpDataReceivedTimer[kinectID] = setTimeout(function () {
            $('#kinectData #kinect' + kinectID + ' .kinectStatus').removeClass('success danger');
            $('#kinectData #kinect' + kinectID + ' .kinectTrackingData').text("---no data received---");
            $('#kinectData #kinect' + kinectID + ' .sourceIP').text("---no data received---");
            $('#kinectData #kinect' + kinectID + ' .trackingGestures').text("---no data received---");
            $('#kinectData #kinect' + kinectID + ' .trackingGesturePosition').text("---no data received---");
            //$('#kinectData #kinect' + kinectID).attr("source", "no-source");
        }, UDP_DISCONNECT_TIMEOUT_MILLISECONDS);
    }

    function clearNoUdpKinectDataReceivedTimer(kinectID) {
        clearTimeout(noUdpDataReceivedTimer[kinectID]);
    }


    var noTcpDataReceivedTimer = [];

    function startNoTcpDataReceivedTimer(ipv4Adress) {
        noTcpDataReceivedTimer[ipv4Adress] = setTimeout(function () {
            $('tr[source="' + ipv4Adress + '"] .clientStatus').removeClass('success');
            removeKinectFromTable(ipv4Adress);
            console.log("noTcpDataReceived timer elapsed");
        }, TCP_DISCONNECT_TIMEOUT_MILLISECONDS);
    }

    function clearNoTcpDataReceivedTimer(ipv4Adress) {
        clearTimeout(noTcpDataReceivedTimer[ipv4Adress]);
    }

    function addKinectToTable(id, ipv4Adress) {
        var tableHTMLContent = '<tr id="kinect' + id + '" source="' + ipv4Adress + '">' +
            '<th>' + id + '</th>' +
            '<td class="clientStatus"></td>' +
            '<td class="kinectStatus"></td>' +
            '<td class="kinectTrackingData"></td>' +
            '<td class="sourceIP">' + ipv4Adress + '</td>' +
            '<td class="trackingGestures"></td>' +
            '<td class="trackingGesturePosition"></td>' +
            '</tr>';

        $('#kinectData tbody').append(tableHTMLContent);
    }

    function removeKinectFromTable(ipv4adress) {
        $('[source="' + ipv4adress + '"]').remove();
    }

});

var _validFileExtensions = [".dat"];
function validateSingleInput(oInput) {
    if (oInput.type == "file") {
        var sFileName = oInput.value;
        if (sFileName.length > 0) {
            var blnValid = false;
            for (var j = 0; j < _validFileExtensions.length; j++) {
                var sCurExtension = _validFileExtensions[j];
                if (sFileName.substr(sFileName.length - sCurExtension.length, sCurExtension.length).toLowerCase() == sCurExtension.toLowerCase()) {
                    blnValid = true;
                    $('#submitGestureFileButton').removeClass('disabled btn-default');
                    $('#submitGestureFileButton').addClass('btn-info');
                    break;
                }
            }

            if (!blnValid) {
                alert("Sorry, " + oInput.value + " is invalid, allowed extensions are: " + _validFileExtensions.join(", "));
                oInput.value = "";
                return false;
            }
        }
    }
    return true;
}

socket.emit('get_gesture_files');

function sendDataToServer() {
    socket.emit("test_sending", { positionVector: [1,0,0,1] });
}

function deleteGestureFile(file) {
    if (confirm("Do you really want to delete gesture: " + file + "?")) {
        socket.emit('remove_gesture_file', file);
    }
}

function untrackGestureFile(file) {
    socket.emit('untrack_gesture_file', file);
}

function trackGestureFile(file) {
    socket.emit('track_gesture_file', file);
}

function updateRoomSettings() {

    $('#save-room-settings-btn').attr("disabled", "true");

    let width = $("#room-width").val();
    let length = $("#room-length").val();

    socket.emit('update_room_settings', {
        width: width,
        length: length
    });
}