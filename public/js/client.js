$(function () {
    var socket = io();
    socket.on('update_data', function (data) {
        if (data.isTrackingBody === true) {
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').addClass('success');
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').removeClass('danger');
        }
        else {
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').removeClass('success');
            $('#kinectData #kinect' + data.kinectData.ID + ' .kinectStatus').addClass('danger');
        }
        $('#kinectData #kinect' + data.kinectData.ID + ' .kinectTrackingData').text(data.kinectData.positionTracked);
        $('#kinectData #kinect' + data.kinectData.ID + ' .sourceIP').text(data.sourceIP);
    });
});

$(document).ready(function(){
     
});

var _validFileExtensions = [".proto"];
    function ValidateSingleInput(oInput) {
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