const math = require('mathjs');



const dX = 10;
const dY = 0;
const dZ = 2.5;

const angle = math.unit(-90, 'deg');

const translationMatrix = math.matrix([
    [1, 0, 0, dX],
    [0, 1, 0, dY],
    [0, 0, 1, dZ],
    [0, 0, 0, 1]
]);

const rotationMatrix = math.matrix([
    [math.cos(angle),0,math.sin(angle),0],
    [0,1,0,0],
    [-math.sin(angle), 0, math.cos(angle),0],
    [0,0,0,1]
]);

const resultMatrix = math.multiply(translationMatrix,rotationMatrix);

module.exports = {

    translate: function (positionVector) {
        let vector = math.matrix([positionVector.x, positionVector.y, positionVector.z, 1]);
        let result = math.multiply(resultMatrix, vector)._data;

        let translatedVector = { x: result[0], y: result[1], z: result[2] };
        return translatedVector;
    }
}