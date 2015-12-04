"use strict";

const Mills = require('./mills.js');

function gameLengths(n) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += Mills.newGame().finishRandomly().actions.length;
    }
    return [sum / n, sum];
}

const start = Date.now();
const times = gameLengths(10000);
const spentNs = (Date.now() - start) * 1000;

console.log(times[1] / spentNs + " steps/us");
