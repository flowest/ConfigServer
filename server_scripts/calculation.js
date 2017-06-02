const math = require('mathjs');
const room = require("./room");

// var kinectsWithTrackingBodies = { "100": [{ x: 0.1, y: 0, z: 0 }, { x: 0.9, y: 0, z: 0 }, { x: 1.1, y: 0, z: 0 }], "101": [{ x: 2.0, y: 0, z: 0 }] };
var kinectsWithTrackingBodies = { "101": [{ x: 5.0, y: 0, z: 2, fromKinect: "101", trackedGesture: "" }, { x: 7.0, y: 0, z: 2, fromKinect: "101", trackedGesture: "" }] };
// var kinectsWithTrackingBodies = {};
var allTrackedBodies = [];

const ACCEPTABLE_DISTANCE = 0.3;

function getDistance(positionA, positionB) {
    return math.distance([positionA.x, positionA.y, positionA.z], [positionB.x, positionB.y, positionB.z]);
}

module.exports = {

    translate: function (trackedBodies, kinectID) {

        var settingsForKinect = room.kinectConfigFiles.find(setting => {
            return setting.name == kinectID + ".json";
        });

        //when theer is no cinfig file for kienct

        if (settingsForKinect == undefined) {
            let newSettings = {
                newXPos: 0,
                newYPos: 0,
                newRotation: 0,
                fileName: kinectID + ".json"
            }
            room.updateKinectSettings(newSettings);
            room.sendKinectSettingsToClient();

            settingsForKinect = {
                content: {
                    rotation: 0,
                    position: {
                        x: 0,
                        y: 0
                    }
                }
            }
        }

        const angle = math.unit(settingsForKinect.content.rotation, 'deg');

        const translationMatrix = math.matrix([
            [1, 0, 0, settingsForKinect.content.position.x],
            [0, 1, 0, 0],
            [0, 0, 1, settingsForKinect.content.position.y],
            [0, 0, 0, 1]
        ]);

        const rotationMatrix = math.matrix([
            [math.cos(angle), 0, math.sin(angle), 0],
            [0, 1, 0, 0],
            [-math.sin(angle), 0, math.cos(angle), 0],
            [0, 0, 0, 1]
        ]);

        const resultMatrix = math.multiply(translationMatrix, rotationMatrix);

        //do the math

        let translatedBodies = [];

        trackedBodies.forEach(function (body) {
            let vector = math.matrix([body.positionTracked.x, body.positionTracked.y, body.positionTracked.z, 1]);
            let result = math.multiply(resultMatrix, vector)._data;

            translatedBodies.push({
                x: result[0],
                y: result[1],
                z: result[2],
                fromKinect: kinectID,
                trackedGesture: body.trackedGesture
            });
        });

        return {
            translatedBodies: translatedBodies,
            kinectPosition: {
                x: settingsForKinect.content.position.x,
                y: settingsForKinect.content.position.y,
                rotation: settingsForKinect.content.rotation
            }
        };
    },

    manageMerging: function (kinectID, translatedPosition) {

        if (translatedPosition.length > 0) {
            kinectsWithTrackingBodies[kinectID] = translatedPosition;
        }
        else {
            kinectsWithTrackingBodies[kinectID] = [];
        }

        //store all tracked bodies in one array (they are dynamically removed when they are no longer tracked because of the lines above)
        allTrackedBodies = [].concat.apply([], Object.keys(kinectsWithTrackingBodies).map(function (key) {
            return kinectsWithTrackingBodies[key]
        }));

        let filteredBodyList = allTrackedBodies.slice();

        filteredBodyList.forEach(function (body, index) {
            for (var i = 0; i < filteredBodyList.length; i++) {
                if (i == index || body.fromKinect == filteredBodyList[i].fromKinect) {
                    continue;
                }
                else {
                    var distance = getDistance(body, filteredBodyList[i]);
                    if (distance < ACCEPTABLE_DISTANCE) {
                        filteredBodyList.splice(i, 1);
                    }
                }
            }
        });

        return filteredBodyList;
    }
}