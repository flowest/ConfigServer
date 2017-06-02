
var socket = io();

$(function () {

    const UDP_DISCONNECT_TIMEOUT_MILLISECONDS = 1000;
    const TCP_DISCONNECT_TIMEOUT_MILLISECONDS = 10000;

    socket.emit('get_room_settings');
    socket.emit('get_kinect_settings');

    socket.on('send_room_settings', function (roomSettings) {
        $('#save-room-settings-btn').removeAttr("disabled");

        $("#room-width").val(roomSettings.width);
        $("#room-length").val(roomSettings.length);

        $("#room").css({ width: roomSettings.width + 'px', height: roomSettings.length + 'px' });
    });


    socket.on('send_kinect_settings', function (kinectSettings) {

        $("#save-kinect-settings-btn").removeAttr("disabled");;
        $("#save-new-kinect-settings-btn").removeAttr("disabled");
        $("#configModal").modal('hide');
        $("#newSettingsModal").modal('hide');


        $('#kienctSettings').empty();

        kinectSettings.forEach(setting => {

            var buttonHTML = $('<div class="btn-group kinectConfigButtonGroup" role="group">' +
                '<button type="button" class="btn btn-primary kinectConfigButton" data-toggle="modal" data-target="#configModal">' + setting.name + '</button>' +
                '<button type="button" class="btn btn-danger" onclick="deleteKinectSettingFile(\'' + setting.name + '\')">&times;</button>' +
                '</div>');

            buttonHTML.on('click', ".kinectConfigButton", function () {

                $("#kinect-x-pos").val(setting.content.position.x);
                $("#kinect-y-pos").val(setting.content.position.y);
                $("#kinect-rotation").val(setting.content.rotation);
                $("#settings-kinectID").text(setting.name);
            });
            $('#kienctSettings').append(buttonHTML);
        });
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

        if (data.kinectData.trackedBodies) {
            $('#kinectData #kinect' + data.ID + ' .kinectBodiesCount').text(data.trackingBodiesCount);
            $('#kinectData #kinect' + data.ID + ' .kinectTrackingData').html($.map(data.kinectData.trackedBodies, function (obj) {
                return JSON.stringify(obj.positionTracked) + "<br/>";
            }).join(' '));
        }
        else {
            $('#kinectData #kinect' + data.ID + ' .kinectBodiesCount').text("0");
            $('#kinectData #kinect' + data.ID + ' .kinectTrackingData').html("---no body tracked---");
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


        if ($("#room #devices #kinect_device" + data.ID).length === 0) {
            $("#room #devices").append('<div class="device" id="kinect_device' + data.ID + '"><div class="device-label">' + data.ID + '</div></div>');
        }

        var rotation = (360 - parseInt(data.kinectPosition.rotation));
        $(".device#kinect_device" + data.ID).css({ top: data.kinectPosition.y * 100 + 'px', left: data.kinectPosition.x * 100 + 'px', transform: 'rotate(' + rotation + 'deg)' }); //*100 to parse meter from kinect to cm

        if (data.kinectData.trackedBodies) {
            data.translatedPositions.forEach(function (positionVector, index) {

                if ($("#room #kinect_person" + data.ID + "-" + index).length === 0) {
                    $("#room").append('<div class="person" id="kinect_person' + data.ID + "-" + index + '"><div class="person-label">' + data.ID + "-" + index + '</div></div>');
                }

                $('.person#kinect_person' + data.ID + "-" + index).css({ top: positionVector.z * 100 + 'px', left: positionVector.x * 100 + 'px' }); //*100 to parse meter from kinect to cm 
            });

            data.kinectData.trackedBodies.forEach(function (trackedBody, index) {
                if (trackedBody.trackedGesture) {
                    $('#kinectData #kinect' + data.ID + ' .trackingGesturePosition').append(trackedBody.trackedGesture + "@" + JSON.stringify(trackedBody.positionGestureTracked) + "<br/>");
                }
            });
        }
        else {
            if ($("#room [id^=kinect_person" + data.ID + "]").length > 1) {
                $("[id^=kinect_person" + data.ID + "]").remove();
            }
        }
    });



    socket.on('tcp_client_connection_update', function (tcpClientData) {
        if (tcpClientData.status == "disconnect") {
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').removeClass('success');
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').addClass('danger');

            $("#kinect_device" + tcpClientData.ipv4Adress.split('.')[3]).remove();
            $("#kinect_person" + tcpClientData.ipv4Adress.split('.')[3]).remove();

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
            $('#kinectData #kinect' + kinectID + ' .kinectBodiesCount').text('---no data received---');
            $('#kinectData #kinect' + kinectID + ' .kinectTrackingData').html("---no data received---");
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
            '<td class="kinectBodiesCount"></td>' +
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
    socket.emit("test_sending", { positionVector: [1, 0, 0, 1] });
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

function updateKinectSettings() {
    $("#save-kinect-settings-btn").attr("disabled", "true");

    var newXPos = $("#kinect-x-pos").val();
    var newYPos = $("#kinect-y-pos").val();
    var newRotation = $("#kinect-rotation").val();
    var fileName = $("#settings-kinectID").text();
    socket.emit('update_kinect_setting', {
        newXPos: newXPos,
        newYPos: newYPos,
        newRotation: newRotation,
        fileName: fileName
    });
}

function saveNewKinectSettings() {
    var newXPos = $("#new-settings-kinect-x-pos").val();
    var newYPos = $("#new-settings-kinect-y-pos").val();
    var newRotation = $("#new-settings-kinect-rotation").val();
    var fileName = $("#new-settings-kinect-id").val().replace(".", "").replace(",", "") + ".json";

    $("#new-settings-kinect-x-pos").val("");
    $("#new-settings-kinect-y-pos").val("");
    $("#new-settings-kinect-rotation").val("");
    $("#new-settings-kinect-id").val("");

    socket.emit('new_kinect_setting', {
        newXPos: newXPos,
        newYPos: newYPos,
        newRotation: newRotation,
        fileName: fileName
    });
}

function deleteKinectSettingFile(fileName) {

    if (confirm("Delete " + fileName + "?")) {
        socket.emit('delete_kinect_settings', fileName);
    }
}