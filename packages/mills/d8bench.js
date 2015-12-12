"use strict";

var exports = {};
load('./mills.b.js');

function gameLengths(n) {
    const newGame = Mills.newGame;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += newGame().finishSemiRandomly(true).actions.length;
    }
    return [sum / n, sum];
}

const count = (arguments.length > 0) ? parseInt(arguments[0]) : 1000;

print('running ' + count + (count == 1 ? ' game' : ' games'));

const start = Date.now()
    , times = gameLengths(count)
    , spentNs = (Date.now() - start);

print((times[1] / spentNs).toPrecision(4) + ' steps/ms');
print((count / spentNs).toPrecision(4) + ' games/ms');
print((spentNs/1000).toPrecision(4) + ' s total');
