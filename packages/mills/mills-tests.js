Tinytest.add('White start', (test) => {
    const game = Mills.newGame();
    test.equal(game.stage, Mills.STAGES.DROP);
    test.equal(game.player, Mills.PLAYERS.WHITES);
});

Tinytest.add('Game finishes on a victory', (test) => {
    const game = Mills.newGame().finishRandomly();
    test.isTrue(
        game.stage === Mills.STAGES.BLACKS_WON ||
        game.stage === Mills.STAGES.WHITES_WON);
});

Tinytest.add('cannot eat from a mill', (test) => {
    test.equal(Mills.quickLoad('A,D,B,E,CxD,D,X').after('FxA').failure, Mills.FAILURES.CANNOT_EAT_FROM_MILL);
});
