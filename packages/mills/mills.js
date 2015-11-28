/*
 Nine Men's Morris game logic

 A-----B-----C
 | D---E---F |
 | | G-H-I | |
 J-K-L   M-N-O
 | | P-Q-R | |
 | S---T---U |
 V-----W-----X
 */

Mills = (() => {
    "use strict";

    const posCount = 24 // Number of positions on the board
        , pieceCount = 9 // Number of pieces for each player
        , codeForA = 'A'.codePointAt(0); // Codepoint for 'A'

    // Maps logical position names (A..X) to numerical position names (0..23)
    const Pos = (() => {
        let res = {};
        for (let i = 0; i < posCount; i++) {
            res[String.fromCodePoint(codeForA + i)] = i;
        }
        return res;
    })();

    // Initializes an array of size `size`, maps every element with `init`
    const buildArray = (size, init) => Array.apply(null, Array(size)).map(init);

    // Picks a random element from an array
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const Stages = {
        PLACE: 'place',
        MOVE: 'move',
        JUMP: 'jump',
        BLACKS_WON: 'blacks won',
        WHITES_WON: 'whites won'
    };

    const Cells = {
        EMPTY: 0, // initial state, must be 0 as we use Uint8Array
        WHITES: 1,
        BLACKS: 2
    };

    Cells.forPlayer = function (player) {
        return (player === Players.WHITES) ? Cells.WHITES : Cells.BLACKS;
    };

    Cells.forOtherPlayer = function (player) {
        return (player === Players.WHITES) ? Cells.BLACKS : Cells.WHITES;
    };

    const Players = {
        WHITES: 'whites',
        BLACKS: 'blacks'
    };

    // List of lines, where each line is a list of 3 positions.
    const Lines = [
        'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', // Horizontal, top to bottom
        'AJV', 'DKS', 'GLP', 'BEH', 'QTW', 'IMR', 'FNU', 'COX'  // Vertical, left to right
    ].map((descr) =>
        [Pos[descr[0]], Pos[descr[1]], Pos[descr[2]]]);

    // Maps a position to a list of lines, where each line is a list of the 2 other positions
    const LinesForPos = (() => {
        let res = buildArray(posCount, () => []);
        Lines.map((line) => {
            res[line[0]].push([line[1], line[2]]);
            res[line[1]].push([line[0], line[2]]);
            res[line[2]].push([line[0], line[1]]);
        });
        return res;
    })();

    // Maps a position to its neighbors.
    // I enumerate for simplicity, no need to point out that:
    // - it's transitive
    // - there are tons of symmetries
    // - it's be cheap to build from LinesForPos
    const Neigh = {
        [Pos.A]: [Pos.B, Pos.J],
        [Pos.B]: [Pos.A, Pos.C],
        [Pos.C]: [Pos.B, Pos.O],
        [Pos.D]: [Pos.E, Pos.K],
        [Pos.E]: [Pos.B, Pos.D, Pos.F, Pos.H],
        [Pos.F]: [Pos.E, Pos.N],
        [Pos.G]: [Pos.H, Pos.L],
        [Pos.H]: [Pos.E, Pos.G, Pos.I],
        [Pos.I]: [Pos.H, Pos.M],
        [Pos.J]: [Pos.A, Pos.K, Pos.V],
        [Pos.K]: [Pos.D, Pos.J, Pos.L, Pos.S],
        [Pos.L]: [Pos.G, Pos.K, Pos.L],
        [Pos.M]: [Pos.I, Pos.N, Pos.R],
        [Pos.N]: [Pos.F, Pos.M, Pos.O, Pos.U],
        [Pos.O]: [Pos.C, Pos.N, Pos.X],
        [Pos.P]: [Pos.L, Pos.Q],
        [Pos.Q]: [Pos.P, Pos.R, Pos.T],
        [Pos.R]: [Pos.M, Pos.Q],
        [Pos.S]: [Pos.K, Pos.T],
        [Pos.T]: [Pos.Q, Pos.S, Pos.U, Pos.W],
        [Pos.U]: [Pos.N, Pos.T],
        [Pos.V]: [Pos.J, Pos.W],
        [Pos.W]: [Pos.T, Pos.V, Pos.X],
        [Pos.X]: [Pos.O, Pos.W]
    };

    const ActionTypes = {
        DROP: 0,
        MOVE: 1,
        JUMP: 2
    };

    // An action is either:
    // - a drop (no `from`),
    // - a move (`to` is a neighbor of `from`),
    // - a jump (`to` is not a neighbor of `from`).
    // Game.prototype.canEat establishes whether a given action should eat.
    const Action = function (to, from, eats) {
        this.to = to;
        if (from === undefined) {
            this.type = ActionTypes.DROP;
        } else {
            this.from = from;
            if (Neigh[from].indexOf(to) > -1) {
                this.type = ActionTypes.MOVE;
            } else {
                this.type = ActionTypes.JUMP;
            }
            if (eats !== undefined) {
                this.eats = eats;
            }
        }
    };

    Action.prototype.toString = function () {
        let res = String.fromCodePoint(codeForA + this.to);
        if (this.from !== undefined)
            res = String.fromCodePoint(codeForA + this.from).concat('-', res);
        if (this.eats !== undefined)
            res = res.concat('x', String.fromCodePoint(codeForA + this.eats));
        return res;
    };

    const actionRegex = /^(?:([A-X])-)?([A-X])(?:x([A-X]))?$/;

    Action.fromString = function (str) {
        let match = str.match(actionRegex);
        if (match) {
            match[2] = match[2].codePointAt(0) - codeForA;
            if (match[1])
                match[1] = match[1].codePointAt(0) - codeForA;
            if (match[3])
                match[3] = match[3].codePointAt(0) - codeForA;
            return new Action(match[2], match[1], match[3]);
        }
    };

    const Game = function (parent, action, validate) {
        this.failure = undefined;
        if (parent === undefined) {
            this.player = Players.WHITES; // whites start; mirrors chess
            this.stage = Stages.PLACE;
            this.actions = [];
            this.board = new Uint8Array(posCount);
        } else {
            this.stage = parent.stage;
            this.actions = parent.actions.slice();
            this.board = parent.board.slice();
            if (validate)
                this.failure = this._failureForAction(action, parent.player);
            if (!this.failure)
                this._applyAction(action, parent.player);
            this.player = (parent.player === Players.WHITES) ? Players.BLACKS : Players.WHITES;
        }
        Object.freeze(this);
    };

    // Cell print
    const cp = function (cell) {
        switch (cell) {
            case Cells.BLACKS:
                return 'B';
            case Cells.WHITES:
                return 'W';
            default:
                return '+';
        }
    };

    Game.prototype.toString = function () {
        let board = this.board;
        let res;
        switch (this.stage) {
            case Stages.BLACKS_WON:
            case Stages.WHITES_WON:
                res = this.stage;
                break;
            default:
                res = this.player === Players.WHITES ? 'whites play' : 'blacks play';
        }

        if (this.failure)
            res = res.concat('\nFailure: ', this.failure);

        res = res.concat('\nActions: ', this.actions.join(', '));

        return res.concat('\n',
            cp(board[0]), '-----', cp(board[1]), '-----', cp(board[2]), '\n| ',
            cp(board[3]), '---', cp(board[4]), '---', cp(board[5]), ' |\n| | ',
            cp(board[6]), '-', cp(board[7]), '-', cp(board[8]), ' | |\n',
            cp(board[9]), '-', cp(board[10]), '-', cp(board[11]), '   ', cp(board[12]), '-', cp(board[13]), '-', cp(board[14]), '\n| | ',
            cp(board[15]), '-', cp(board[16]), '-', cp(board[17]), ' | |\n| ',
            cp(board[18]), '---', cp(board[19]), '---', cp(board[20]), ' |\n',
            cp(board[21]), '-----', cp(board[22]), '-----', cp(board[23]));
    };

    // An action eats iff it creates a line of 3 cells when there wasn't one before.
    Game.prototype.canEat = function (action, player) {
        let neededInLine = Cells.forPlayer(player);
        return !!LinesForPos[action.to].find((others) =>
        others[0] != action.from &&
        others[1] != action.from &&
        this.board[others[0]] === neededInLine &&
        this.board[others[1]] === neededInLine);
    };

    // Returns a message explaining why a move is illegal, or undefined if it's legal
    Game.prototype._failureForAction = function (action, player) {
        if (this.stage === Stages.WHITES_WON || this.stage === Stages.BLACKS_WON)
            return 'game over';

        if (this.stage === Stages.PLACE) {
            if (action.type !== ActionTypes.DROP)
                return 'should be a drop';
        } else {
            if (action.type === ActionTypes.DROP)
                return 'drop not allowed';
            else if (action.type === ActionTypes.JUMP && this.stage === Stages.MOVE)
                return 'jump not allowed';
        }
        if (this.board[action.to] !== Cells.EMPTY) {
            return 'destination is taken';
        }
        if (action.from !== undefined) {
            switch (this.board[action.from]) {
                case Cells.EMPTY:
                    return 'no piece there';
                case Cells.forOtherPlayer(player):
                    return 'not your piece';
            }
        }
        if (this.canEat(action, player)) {
            if (action.eats === undefined)
                return 'must eat';
            if (this.board[action.eats] !== Cells.forOtherPlayer(player))
                return 'must eat a piece from your opponent';
        }
    };

    // Applies a trusted action
    Game.prototype._applyAction = function (action, player) {
        let board = this.board;

        board[action.to] = Cells.forPlayer(player);
        if (action.from !== undefined)
            board[action.from] = Cells.EMPTY;
        if (action.eats !== undefined)
            board[action.eats] = Cells.EMPTY;

        this.actions.push(action);

        if (this.actions.length < 2 * pieceCount) {
            this.stage = Stages.PLACE;
        } else {
            let blacksCount = 0, whitesCount = 0, blacksCanMove = false, whitesCanMove = false;
            board.forEach((cell, pos) => {
                switch (cell) {
                    case Cells.BLACKS:
                        blacksCount++;
                        if (!blacksCanMove)
                            blacksCanMove = !!Neigh[pos].find((pos) => board[pos] === Cells.EMPTY);
                        break;
                    case Cells.WHITES:
                        whitesCount++;
                        if (!whitesCanMove)
                            whitesCanMove = !!Neigh[pos].find((pos) => board[pos] === Cells.EMPTY);
                        break;
                }
            });

            if (whitesCount === 3)
                whitesCanMove = true;
            if (blacksCount === 3)
                blacksCanMove = true;

            if (blacksCount <= 2 || (!blacksCanMove && blacksCount != 3)) {
                this.stage = Stages.WHITES_WON;
            } else if (whitesCount <= 2 || (!whitesCanMove && whitesCount != 3)) {
                this.stage = Stages.BLACKS_WON;
            } else {
                if (player === Players.WHITES && blacksCount === 3)
                    this.stage = Stages.JUMP;
                else if (player === Players.BLACKS && whitesCount === 3)
                    this.stage = Stages.JUMP;
                else
                    this.stage = Stages.MOVE;
            }
        }
    };

    // All "eating" variants of a given action.
    Game.prototype._withEat = function (action, player) {
        const res = [], eatable = Cells.forOtherPlayer(player);
        this.board.forEach((cell, pos) => {
            if (cell === eatable)
                res.push(new Action(action.to, action.from, pos));
        });
        return res;
    };

    Game.prototype.possibleMoves = function () {
        const player = this.player, stage = this.stage, board = this.board;

        if (stage === Stages.WHITES_WON || stage === Stages.BLACKS_WON)
            return [];
        if (stage === Stages.PLACE) {
            const placements = [];
            board.forEach((cell, pos) => {
                if (cell === Cells.EMPTY) {
                    const action = new Action(pos);
                    if (this.canEat(action, player)) {
                        placements.push.apply(placements, this._withEat(action, player));
                    } else {
                        placements.push(action);
                    }
                }
            });
            return placements;
        }

        // We'll move or jump, let's enumerate positions for various piece types at once
        const ourCell = Cells.forPlayer(this.player), ours = [], theirs = [], empty = [];
        board.forEach((cell, pos) => {
            switch (cell) {
                case Cells.EMPTY:
                    empty.push(pos);
                    break;
                case ourCell:
                    ours.push(pos);
                    break;
                default:
                    theirs.push(pos);
            }
        });

        const res = [];
        ours.forEach((from) => {
            if (this.stage === Stages.JUMP) {
                empty.forEach((to) => {
                    const jump = new Action(to, from);
                    if (this.canEat(jump, player))
                        res.push.apply(res, this._withEat(jump, player));
                    else
                        res.push(jump);
                });
            } else {
                Neigh[from].forEach((to) => {
                    if (board[to] === Cells.EMPTY) {
                        const move = new Action(to, from);
                        if (this.canEat(move, player))
                            res.push.apply(res, this._withEat(move, player));
                        else
                            res.push(move);
                    }
                });
            }
        });
        return res;
    };

    Game.prototype.after = function (action, validate) {
        if (typeof action === 'string')
            action = Action.fromString(action);
        if (validate === undefined)
            validate = true;
        return new Game(this, action, validate);
    };

    Game.prototype._finish = function (log, lambda) {
        let res = this, steps = 0;
        while (res.stage !== Stages.BLACKS_WON && res.stage !== Stages.WHITES_WON) {
            res = new Game(res, lambda(res));
            steps++;
            if (steps > 1000) {
                throw 42;
            }
        }
        return res;
    };

    Game.prototype.finishRandomly = function (log) {
        return this._finish(log, (game) => pickRandom(game.possibleMoves()));
    };

    let pickEatingFirst = function (moves) {
        let eating = moves.find((move) => move.eats);
        if (eating) return eating;
        return pickRandom(moves);
    };

    Game.prototype.finishSemiRandomly = function (log) {
        return this._finish(log, (game) => pickEatingFirst(game.possibleMoves()));
    };

    let quickLoad = function (str) {
        let game = new Game();
        if (str)
            str.split(', ', false).forEach((action) => {
                game = game.after(action);
            });
        return game;
    };

    return ({
        newGame: () => new Game(),
        quickLoad: quickLoad,
        Stages: Stages,
        Cells: Cells,
        Players: Players,
        Pos: Pos
    });
})();
