$(function () {

    const DISCONNECT_TIMEOUT_MILLISECONDS = 1000;

    var socket = io();

    socket.on('kinect_update_data', function (data) {

        clearNoKinectDataReceivedTimer(data.kinectData.ID);

        if (data.kinectData.isTrackingBody == true) {
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').addClass('success');
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').removeClass('danger');
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectTrackingData').text(data.kinectData.positionTracked);
        }
        else {
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').removeClass('success');
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').addClass('danger');
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectTrackingData').text("---no body tracked---");
        }
        $('#kinectData #kinect' + data.kinectData.ID + ' .sourceIP').text(data.sourceIP);
        $('#kinectData #kinect' + data.kinectData.ID).attr("source", data.sourceIP);

        startNoKinectDataReceivedTimer(data.kinectData.ID);
    });



    socket.on('tcp_client_update', function (tcpClientData) {
        if (tcpClientData.status == "disconnect") {
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').removeClass('success');
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').addClass('danger');
        }
        else if (tcpClientData.status == "connect"){
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').removeClass('danger');
            $('tr[source="' + tcpClientData.ipv4Adress + '"] .clientStatus').addClass('success');
        }
    });

    var noDataReceivedTimer = [];

    function startNoKinectDataReceivedTimer(kinectID) {
        noDataReceivedTimer[kinectID] = setTimeout(function () {
            $('#kinectData #kinect' + kinectID + ' .kinectStatus').removeClass('success danger');
            $('#kinectData #kinect' + kinectID + ' .kinectTrackingData').text("---no data received---");
            $('#kinectData #kinect' + kinectID + ' .sourceIP').text("---no data received---");
            $('#kinectData #kinect' + kinectID).attr("source", "no-source");
        }, DISCONNECT_TIMEOUT_MILLISECONDS);
    }

    function clearNoKinectDataReceivedTimer(kinectID) {
        clearTimeout(noDataReceivedTimer[kinectID]);
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