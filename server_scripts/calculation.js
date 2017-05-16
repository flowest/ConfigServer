const math = require('mathjs');



const dX = 5;
const dY = 0;
const dZ = 0;

const matrix = math.matrix([
    [1, 0, 0, dX],
    [0, 1, 0, dY],
    [0, 0, 1, dZ],
    [0, 0, 0, 1]
]);

module.exports = {

    translate: function (positionVector) {
        let vector = math.matrix([positionVector.x, positionVector.y, positionVector.z, 1]);
        let result = math.multiply(matrix, vector)._data;

        let translatedVector = { x: result[0], y: result[1], z: result[2] };
        return translatedVector;
    }
}