Tinytest.add('white starts', (test) => {
    const game = Mills.newGame();
    test.equal(game.stage, Mills.STAGES.PLACE);
    test.equal(game.player, Mills.PLAYERS.WHITES);
});

Tinytest.add('game finishes on a victory', (test) => {
    const game = Mills.newGame().finishRandomly();
    test.isTrue(
        game.stage === Mills.STAGES.BLACKS_WON ||
        game.stage === Mills.STAGES.WHITES_WON);
});

Tinytest.add('cannot eat from a mill', (test) => {
    test.equal(Mills.quickLoad('A,D,B,E,CxD,D,X').after('FxA').failure, 'cannot eat from a mill when the opponent has pieces outside of a mill');
});
