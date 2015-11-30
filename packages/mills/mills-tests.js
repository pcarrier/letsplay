Tinytest.add('white starts', function (test) {
    let game = Mills.newGame();
    test.equal(game.stage, Mills.Stages.PLACE);
    test.equal(game.player, Mills.Players.WHITES);
});

Tinytest.add('game finishes on a victory', function (test) {
    let game = Mills.newGame().finishRandomly();
    test.isTrue(game.stage === Mills.Stages.BLACKS_WON || game.stage === Mills.Stages.WHITES_WON);
});
