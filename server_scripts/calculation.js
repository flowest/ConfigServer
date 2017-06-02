const math = require('mathjs');
const room = require("./room");


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

        let translatedPositions = [];

        trackedBodies.forEach(function (body) {
            let vector = math.matrix([body.positionTracked.x, body.positionTracked.y, body.positionTracked.z, 1]);
            let result = math.multiply(resultMatrix, vector)._data;

            translatedPositions.push({ x: result[0], y: result[1], z: result[2] });

        });

        return {
            translatedPositions: translatedPositions,
            kinectPosition: {
                x: settingsForKinect.content.position.x,
                y: settingsForKinect.content.position.y,
                rotation: settingsForKinect.content.rotation
            }
        };
    }
}