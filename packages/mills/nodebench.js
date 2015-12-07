"use strict";

let m = require('./mills.b.js');

function gameLengths(n) {
    const newGame = m.Mills.newGame;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += newGame().finishSemiRandomly(true).actions.length;
    }
    return [sum / n, sum];
}

const args = process.argv,
    count = (args.length > 2) ? parseInt(args[2]) : 1000;

console.log('running ' + count + (count == 1 ? ' game' : ' games'));

const start = Date.now()
    , times = gameLengths(count)
    , spentNs = (Date.now() - start);

console.log((times[1] / spentNs).toPrecision(4) + ' steps/ms');
console.log((count / spentNs).toPrecision(4) + ' games/ms');
console.log((spentNs/1000).toPrecision(4) + ' s total');
