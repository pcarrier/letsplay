Mills = (() => {
    "use strict";

    const posCount = 24 // Number of positions on the board
        , pieceCount = 9 // Number of pieces for each player
        , codeForA = 'A'.codePointAt(0); // Codepoint for 'A'

    // Maps logical position names (A..X) to numerical position names (0..23)
    const POS = (() => {
        const res = {};
        for (let i = 0; i < posCount; i++) {
            res[String.fromCodePoint(codeForA + i)] = i;
        }
        return res;
    })();

    // Picks a random element from an array
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const STAGES = {
        PLACE: 'place',
        MOVE: 'move',
        JUMP: 'jump',
        BLACKS_WON: 'blacks won',
        WHITES_WON: 'whites won'
    };

    const CELLS = {
        EMPTY: 0, // initial state, must be 0 as we use Uint8Array
        WHITES: 1,
        BLACKS: 2
    };

    const PLAYERS = {
        WHITES: 'whites',
        BLACKS: 'blacks'
    };

    CELLS.forPlayer = (player) =>
        (player === PLAYERS.WHITES) ? CELLS.WHITES : CELLS.BLACKS;

    CELLS.forOtherPlayer = (player) =>
        (player === PLAYERS.WHITES) ? CELLS.BLACKS : CELLS.WHITES;

    // List of lines, where each line is a list of 3 positions.
    const LINES = [
        'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', // Horizontal, top to bottom
        'AJV', 'DKS', 'GLP', 'BEH', 'QTW', 'IMR', 'FNU', 'COX'  // Vertical, left to right
    ].map((descr) =>
        [POS[descr[0]], POS[descr[1]], POS[descr[2]]]);

    // Maps a position to a list of lines, where each line is a list of the 2 other positions
    const POS_TO_LINES = (() => {
        const res = [];
        for (let i = 0; i < posCount; i++) {
            res[i] = [];
        }
        LINES.forEach((line) => {
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
    // - it's be cheap to build from POS_TO_LINES
    const NEIGH = {
        [POS.A]: [POS.B, POS.J],
        [POS.B]: [POS.A, POS.C],
        [POS.C]: [POS.B, POS.O],
        [POS.D]: [POS.E, POS.K],
        [POS.E]: [POS.B, POS.D, POS.F, POS.H],
        [POS.F]: [POS.E, POS.N],
        [POS.G]: [POS.H, POS.L],
        [POS.H]: [POS.E, POS.G, POS.I],
        [POS.I]: [POS.H, POS.M],
        [POS.J]: [POS.A, POS.K, POS.V],
        [POS.K]: [POS.D, POS.J, POS.L, POS.S],
        [POS.L]: [POS.G, POS.K, POS.L],
        [POS.M]: [POS.I, POS.N, POS.R],
        [POS.N]: [POS.F, POS.M, POS.O, POS.U],
        [POS.O]: [POS.C, POS.N, POS.X],
        [POS.P]: [POS.L, POS.Q],
        [POS.Q]: [POS.P, POS.R, POS.T],
        [POS.R]: [POS.M, POS.Q],
        [POS.S]: [POS.K, POS.T],
        [POS.T]: [POS.Q, POS.S, POS.U, POS.W],
        [POS.U]: [POS.N, POS.T],
        [POS.V]: [POS.J, POS.W],
        [POS.W]: [POS.T, POS.V, POS.X],
        [POS.X]: [POS.O, POS.W]
    };

    const ACTION_TYPES = {
        DROP: 0,
        MOVE: 1,
        JUMP: 2
    };

    const ACTION_RE = /^([A-X])?([A-X])(?:x([A-X]))?$/;

    // An action is either:
    // - a drop (no `from`),
    // - a move (`to` is a neighbor of `from`),
    // - a jump (`to` is not a neighbor of `from`).
    // Game.prototype.canEat establishes whether a given action should eat.
    class Action {
        constructor(to, from, eats) {
            this.to = to;
            if (from === undefined) {
                this.type = ACTION_TYPES.DROP;
            } else {
                this.from = from;
                if (NEIGH[from].indexOf(to) > -1) {
                    this.type = ACTION_TYPES.MOVE;
                } else {
                    this.type = ACTION_TYPES.JUMP;
                }
                if (eats !== undefined) {
                    this.eats = eats;
                }
            }
        };

        toString() {
            let res = String.fromCodePoint(codeForA + this.to);
            if (this.from !== undefined)
                res = String.fromCodePoint(codeForA + this.from).concat(res);
            if (this.eats !== undefined)
                res = res.concat('x', String.fromCodePoint(codeForA + this.eats));
            return res;
        };

        static fromString(str) {
            const match = str.match(ACTION_RE);
            if (match) {
                match[2] = match[2].codePointAt(0) - codeForA;
                if (match[1])
                    match[1] = match[1].codePointAt(0) - codeForA;
                if (match[3])
                    match[3] = match[3].codePointAt(0) - codeForA;
                return new Action(match[2], match[1], match[3]);
            }
        };
    }

    class Game {
        constructor(parent, action, validate) {
            this.failure = undefined;
            const mills = new Uint8Array(posCount);
            this.mills = mills;

            if (parent === undefined) {
                this.player = PLAYERS.WHITES; // whites start; mirrors chess
                this.stage = STAGES.PLACE;
                this.actions = [];
                this.board = new Uint8Array(posCount);
            } else {
                this.stage = parent.stage;
                this.actions = parent.actions.slice();
                const board = parent.board.slice();
                this.board = board;
                if (validate)
                    this.failure = this._failureForAction(action, parent.player);
                if (!this.failure)
                    this._applyAction(action, parent.player);

                LINES.forEach((line) => {
                    const a = line[0], b = line[1], c = line[2];
                    if (board[a] === CELLS.BLACKS && board[b] === CELLS.BLACKS && board[c] === CELLS.BLACKS) {
                        mills[a] = CELLS.BLACKS;
                        mills[b] = CELLS.BLACKS;
                        mills[c] = CELLS.BLACKS;
                    } else if (board[a] === CELLS.WHITES && board[b] === CELLS.WHITES && board[c] === CELLS.WHITES) {
                        mills[a] = CELLS.WHITES;
                        mills[b] = CELLS.WHITES;
                        mills[c] = CELLS.WHITES;
                    }
                });

                this.player = (parent.player === PLAYERS.WHITES) ? PLAYERS.BLACKS : PLAYERS.WHITES;
            }
            Object.freeze(this);
        };

        toString() {
            const board = this.board;
            let res;

            switch (this.stage) {
                case STAGES.BLACKS_WON:
                case STAGES.WHITES_WON:
                    res = this.stage;
                    break;
                default:
                    res = this.player === PLAYERS.WHITES ? 'whites play' : 'blacks play';
            }

            if (this.failure)
                res = res.concat('\nFailure: ', this.failure);

            res = res.concat('\nActions: ', this.actions.join(','));

            const cp = (cell) => {
                switch (cell) {
                    case CELLS.BLACKS:
                        return 'B';
                    case CELLS.WHITES:
                        return 'W';
                    default:
                        return '+';
                }
            };

            return res.concat('\n',
                cp(board[0]), '-----', cp(board[1]), '-----', cp(board[2]), '\n| ',
                cp(board[3]), '---', cp(board[4]), '---', cp(board[5]), ' |\n| | ',
                cp(board[6]), '-', cp(board[7]), '-', cp(board[8]), ' | |\n',
                cp(board[9]), '-', cp(board[10]), '-', cp(board[11]), '   ', cp(board[12]), '-', cp(board[13]), '-', cp(board[14]), '\n| | ',
                cp(board[15]), '-', cp(board[16]), '-', cp(board[17]), ' | |\n| ',
                cp(board[18]), '---', cp(board[19]), '---', cp(board[20]), ' |\n',
                cp(board[21]), '-----', cp(board[22]), '-----', cp(board[23]));
        };

        // Applies a trusted action
        _applyAction(action, player) {
            const board = this.board;

            board[action.to] = CELLS.forPlayer(player);
            if (action.from !== undefined)
                board[action.from] = CELLS.EMPTY;
            if (action.eats !== undefined)
                board[action.eats] = CELLS.EMPTY;

            this.actions.push(action);

            if (this.actions.length < 2 * pieceCount) {
                this.stage = STAGES.PLACE;
            } else {
                let blacksCount = 0, whitesCount = 0, blacksCanMove = false, whitesCanMove = false;
                board.forEach((cell, pos) => {
                    switch (cell) {
                        case CELLS.BLACKS:
                            blacksCount++;
                            if (!blacksCanMove)
                                blacksCanMove = !!NEIGH[pos].find((pos) => board[pos] === CELLS.EMPTY);
                            break;
                        case CELLS.WHITES:
                            whitesCount++;
                            if (!whitesCanMove)
                                whitesCanMove = !!NEIGH[pos].find((pos) => board[pos] === CELLS.EMPTY);
                            break;
                    }
                });

                if (whitesCount === 3)
                    whitesCanMove = true;
                if (blacksCount === 3)
                    blacksCanMove = true;

                if (blacksCount <= 2 || (!blacksCanMove && blacksCount != 3)) {
                    this.stage = STAGES.WHITES_WON;
                } else if (whitesCount <= 2 || (!whitesCanMove && whitesCount != 3)) {
                    this.stage = STAGES.BLACKS_WON;
                } else {
                    if (player === PLAYERS.WHITES && blacksCount === 3)
                        this.stage = STAGES.JUMP;
                    else if (player === PLAYERS.BLACKS && whitesCount === 3)
                        this.stage = STAGES.JUMP;
                    else
                        this.stage = STAGES.MOVE;
                }
            }
        };

        // An action eats iff it creates a line of 3 cells when there wasn't one before.
        _canEat(action, player) {
            const neededInLine = CELLS.forPlayer(player);
            return !!POS_TO_LINES[action.to].find((others) =>
            others[0] != action.from &&
            others[1] != action.from &&
            this.board[others[0]] === neededInLine &&
            this.board[others[1]] === neededInLine);
        };

        // Returns a message explaining why a move is illegal, or undefined if it's legal
        _failureForAction(action, player) {
            if (this.stage === STAGES.WHITES_WON || this.stage === STAGES.BLACKS_WON)
                return 'game over';

            if (this.stage === STAGES.PLACE) {
                if (action.type !== ACTION_TYPES.DROP)
                    return 'should be a drop';
            } else {
                if (action.type === ACTION_TYPES.DROP)
                    return 'drop not allowed';
                else if (action.type === ACTION_TYPES.JUMP && this.stage === STAGES.MOVE)
                    return 'jump not allowed';
            }
            if (this.board[action.to] !== CELLS.EMPTY) {
                return 'destination is already taken';
            }

            const otherPlayCell = CELLS.forOtherPlayer(player);

            if (action.from !== undefined) {
                switch (this.board[action.from]) {
                    case CELLS.EMPTY:
                        return 'no piece there';
                    case otherPlayCell:
                        return 'not your piece';
                }
            }

            if (this._canEat(action, player)) {
                if (action.eats === undefined)
                    return 'must eat';
                if (this.board[action.eats] !== otherPlayCell)
                    return 'must eat a piece from your opponent';
                if (this.mills[action.eats] !== CELLS.EMPTY &&
                    this.board.find((cell, pos) =>
                    cell === otherPlayCell && this.mills[pos] === CELLS.EMPTY))
                    return 'cannot eat from a mill when the opponent has pieces outside of a mill';
            }
        };

        // All "eating" variants of a given action.
        _withEat(action, player) {
            const ifOnlyMills = [], ifNotOnlyMills = [], eatable = CELLS.forOtherPlayer(player);
            this.board.forEach((cell, pos) => {
                if (cell === eatable) {
                    const eat = new Action(action.to, action.from, pos);
                    ifOnlyMills.push(eat);
                    if (this.mills[pos] === CELLS.EMPTY) {
                        ifNotOnlyMills.push(eat);
                    }
                }
            });
            return (ifNotOnlyMills.length > 0) ? ifNotOnlyMills : ifOnlyMills;
        };

        _finish(log, lambda) {
            let res = this;
            while (res.stage !== STAGES.BLACKS_WON && res.stage !== STAGES.WHITES_WON) {
                res = new Game(res, lambda(res));
                if (log) {
                    console.log(res.toString());
                }
            }
            return res;
        };

        possibleMoves() {
            const player = this.player, stage = this.stage, board = this.board;

            if (stage === STAGES.WHITES_WON || stage === STAGES.BLACKS_WON)
                return [];
            if (stage === STAGES.PLACE) {
                const placements = [];
                board.forEach((cell, pos) => {
                    if (cell === CELLS.EMPTY) {
                        const action = new Action(pos);
                        if (this._canEat(action, player)) {
                            this._withEat(action, player).forEach((act) => placements.push(act));
                        } else {
                            placements.push(action);
                        }
                    }
                });
                return placements;
            }

            // We'll move or jump, let's enumerate positions for various piece types at once
            const ourCell = CELLS.forPlayer(this.player), ours = [], theirs = [], empty = [];
            board.forEach((cell, pos) => {
                switch (cell) {
                    case CELLS.EMPTY:
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
                if (this.stage === STAGES.JUMP) {
                    empty.forEach((to) => {
                        const jump = new Action(to, from);
                        if (this._canEat(jump, player))
                            this._withEat(jump, player).forEach((act) => res.push(act));
                        else
                            res.push(jump);
                    });
                } else {
                    NEIGH[from].forEach((to) => {
                        if (board[to] === CELLS.EMPTY) {
                            const move = new Action(to, from);
                            if (this._canEat(move, player))
                                this._withEat(move, player).forEach((act) => res.push(act));
                            else
                                res.push(move);
                        }
                    });
                }
            });
            return res;
        };

        after(action, validate) {
            if (typeof action === 'string')
                action = Action.fromString(action);
            if (validate === undefined)
                validate = true;
            return new Game(this, action, validate);
        };

        finishRandomly(log) {
            return this._finish(log, (game) => pickRandom(game.possibleMoves()));
        };

        finishSemiRandomly(log) {
            return this._finish(log, (game) => {
                const moves = game.possibleMoves()
                    , eating = moves.find((move) => move.eats);
                if (eating) return eating;
                return pickRandom(moves);
            });
        };
    }

    return ({
        newGame: () => new Game(),
        quickLoad: (str) => {
            let game = new Game();
            if (str)
                str.split(',', false).forEach((action) => {
                    game = game.after(action);
                });
            return game;
        },
        STAGES: STAGES,
        CELLS: CELLS,
        PLAYERS: PLAYERS,
        POS: POS
    });
})();
