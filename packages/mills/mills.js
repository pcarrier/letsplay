Mills = (() => {
    "use strict";

    const POS_COUNT = 24 // Number of positions on the board
        , PIECE_COUNT = 9 // Number of pieces for each player
        , codeForA = 'A'.codePointAt(0);

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

    const FAILURES = {
        GAME_OVER: 'game is already over',
        SHOULD_DROP: 'should be a drop',
        CANNOT_DROP: 'drop not allowed',
        CANNOT_JUMP: 'jump not allowed',
        DEST_IS_NOT_EMPTY: 'destination is already taken',
        SOURCE_IS_EMPTY: 'no piece there',
        SOURCE_IS_OPPONENT: 'not your piece',
        MUST_EAT: 'must eat',
        MUST_EAT_FROM_OPPONENT: 'must eat a piece from your opponent',
        CANNOT_EAT_FROM_MILL: 'cannot eat from a mill when the opponent has pieces outside of a mill'
    };

    // Maps logical position names (A..X) to numerical positions (0..23)
    const POS = (() => {
        const res = {};
        for (let pos = 0; pos < POS_COUNT; pos++) {
            res[String.fromCodePoint(codeForA + pos)] = pos;
        }
        return res;
    })();

    // List of lines, where each line is a list of 3 positions.
    const LINES = [
        'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', // Horizontal, top to bottom
        'AJV', 'DKS', 'GLP', 'BEH', 'QTW', 'IMR', 'FNU', 'COX'  // Vertical, left to right
    ].map((descr) =>
        [POS[descr[0]], POS[descr[1]], POS[descr[2]]]);

    // Maps a position to 2 flattened pairs of peers
    const POS_TO_LINES = (() => {
        const res = [];
        for (let pos = 0; pos < POS_COUNT; pos++) {
            res[pos] = [];
        }
        for (let i = 0; i < LINES.length; i++) {
            const line = LINES[i];
            res[line[0]].push(line[1]);
            res[line[0]].push(line[2]);
            res[line[1]].push(line[0]);
            res[line[1]].push(line[2]);
            res[line[2]].push(line[0]);
            res[line[2]].push(line[1]);
        }
        return res;
    })();

    // Maps a position to its neighbors.
    // I enumerate for simplicity, no need to point out that:
    // - it's transitive
    // - there are tons of symmetries
    // - it's be cheap to build from POS_TO_LINES
    const NEIGH = [
        /*[POS.A]:*/ [POS.B, POS.J],
        /*[POS.B]:*/ [POS.A, POS.C],
        /*[POS.C]:*/ [POS.B, POS.O],
        /*[POS.D]:*/ [POS.E, POS.K],
        /*[POS.E]:*/ [POS.B, POS.D, POS.F, POS.H],
        /*[POS.F]:*/ [POS.E, POS.N],
        /*[POS.G]:*/ [POS.H, POS.L],
        /*[POS.H]:*/ [POS.E, POS.G, POS.I],
        /*[POS.I]:*/ [POS.H, POS.M],
        /*[POS.J]:*/ [POS.A, POS.K, POS.V],
        /*[POS.K]:*/ [POS.D, POS.J, POS.L, POS.S],
        /*[POS.L]:*/ [POS.G, POS.K, POS.L],
        /*[POS.M]:*/ [POS.I, POS.N, POS.R],
        /*[POS.N]:*/ [POS.F, POS.M, POS.O, POS.U],
        /*[POS.O]:*/ [POS.C, POS.N, POS.X],
        /*[POS.P]:*/ [POS.L, POS.Q],
        /*[POS.Q]:*/ [POS.P, POS.R, POS.T],
        /*[POS.R]:*/ [POS.M, POS.Q],
        /*[POS.S]:*/ [POS.K, POS.T],
        /*[POS.T]:*/ [POS.Q, POS.S, POS.U, POS.W],
        /*[POS.U]:*/ [POS.N, POS.T],
        /*[POS.V]:*/ [POS.J, POS.W],
        /*[POS.W]:*/ [POS.T, POS.V, POS.X],
        /*[POS.X]:*/ [POS.O, POS.W]
    ];

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
            from = from === undefined ? -1 : from;
            eats = eats === undefined ? -1 : eats;

            this.to = to;
            this.from = from;
            this.eats = eats;

            if (from < 0) {
                this.type = ACTION_TYPES.DROP;
            } else {
                if (NEIGH[from].indexOf(this.to) < 0) {
                    this.type = ACTION_TYPES.JUMP;
                } else {
                    this.type = ACTION_TYPES.MOVE;
                }
            }
        };

        toString() {
            let res = String.fromCodePoint(codeForA + this.to);
            if (this.from >= 0)
                res = String.fromCodePoint(codeForA + this.from).concat(res);
            if (this.eats >= 0)
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
            if (parent === undefined) {
                this.player = PLAYERS.WHITES; // whites start; mirrors chess
                this.stage = STAGES.PLACE;
                this.actions = [];
                this.board = new Uint8Array(POS_COUNT);
                this.mills = new Uint8Array(POS_COUNT);
                this.failure = undefined;
            } else {
                this.stage = parent.stage;
                this.actions = parent.actions.slice();
                this.board = parent.board.slice();
                this.mills = parent.mills;
                this.player = parent.player;

                if (parent.failure !== undefined) {
                    this.failure = 'parent failed (skipping action)';
                } else {
                    if (validate)
                        this.failure = this._failureForAction(action);
                    if (!this.failure)
                        this._applyAction(action, parent.player);
                }
                this.player = (this.player === PLAYERS.WHITES) ? PLAYERS.BLACKS : PLAYERS.WHITES;
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
                    if (this.failure)
                        res = 'Failure: '.concat(this.failure);
                    else
                        res = this.player === PLAYERS.WHITES ? 'Whites play' : 'Blacks play';
            }

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
        _applyAction(action) {
            const board = this.board
                , player = this.player;

            board[action.to] = CELLS.forPlayer(player);
            if (action.from >= 0)
                board[action.from] = CELLS.EMPTY;
            if (action.eats >= 0)
                board[action.eats] = CELLS.EMPTY;

            this.actions.push(action);

            if (this.actions.length < 2 * PIECE_COUNT) {
                this.stage = STAGES.PLACE;
            } else {
                let blacksCount = 0
                    , whitesCount = 0
                    , blacksCanMove = false
                    , whitesCanMove = false;
                for (let pos = 0; pos < POS_COUNT; pos++) {
                    switch (board[pos]) {
                        case CELLS.BLACKS:
                            blacksCount++;
                            if (!blacksCanMove) {
                                const neighbors = NEIGH[pos];
                                for (let n = 0; n < neighbors.length; n++) {
                                    if (board[neighbors[n]] === CELLS.EMPTY) {
                                        blacksCanMove = true;
                                        break;
                                    }
                                }
                            }
                            break;
                        case CELLS.WHITES:
                            whitesCount++;
                            if (!whitesCanMove) {
                                const neighbors = NEIGH[pos];
                                for (let n = 0; n < neighbors.length; n++) {
                                    if (board[neighbors[n]] === CELLS.EMPTY) {
                                        whitesCanMove = true;
                                        break;
                                    }
                                }
                            }
                            break;
                        default:
                            break;
                    }
                }

                if (whitesCount === 3)
                    whitesCanMove = true;
                if (blacksCount === 3)
                    blacksCanMove = true;

                if (blacksCount <= 2 || (!blacksCanMove && blacksCount != 3)) {
                    this.stage = STAGES.WHITES_WON;
                } else if (whitesCount <= 2 || (!whitesCanMove && whitesCount != 3)) {
                    this.stage = STAGES.BLACKS_WON;
                } else {
                    if ((player === PLAYERS.WHITES && blacksCount === 3) ||
                        (player === PLAYERS.BLACKS && whitesCount === 3))
                        this.stage = STAGES.JUMP;
                    else
                        this.stage = STAGES.MOVE;
                }
            }

            this.mills = new Uint8Array(POS_COUNT);
            for (let i = 0; i < LINES.length; i++) {
                const line = LINES[i], a = line[0], b = line[1], c = line[2], exp = LINES[a];
                if (board[b] === exp && board[c] === exp) {
                    this.mills[a] = this.mills[b] = this.mills[c] = exp;
                }
            }
        };

        // An action eats iff it creates a line of 3 cells when there wasn't one before.
        _canEat(action) {
            const req = CELLS.forPlayer(this.player)
                , cells = POS_TO_LINES[action.to]
                , a = cells[0]
                , b = cells[1]
                , c = cells[2]
                , d = cells[3];

            return !!((a !== action.from && b !== action.from && this.board[a] === req && this.board[b] === req) ||
            (c !== action.from && d !== action.from && this.board[c] === req && this.board[d] === req));

        };

        // Returns a message explaining why a move is illegal, or undefined if it's legal
        _failureForAction(action) {
            const stage = this.stage
                , board = this.board;

            if (stage === STAGES.WHITES_WON || stage === STAGES.BLACKS_WON)
                return FAILURES.GAME_OVER;

            if (stage === STAGES.PLACE) {
                if (action.type !== ACTION_TYPES.DROP)
                    return FAILURES.SHOULD_DROP;
            } else {
                if (action.type === ACTION_TYPES.DROP)
                    return FAILURES.CANNOT_DROP;
                else if (action.type === ACTION_TYPES.JUMP && stage === STAGES.MOVE)
                    return FAILURES.CANNOT_JUMP;
            }
            if (board[action.to] !== CELLS.EMPTY) {
                return FAILURES.DEST_IS_NOT_EMPTY;
            }

            const otherPlayCell = CELLS.forOtherPlayer(this.player);

            if (action.from >= 0) {
                switch (board[action.from]) {
                    case CELLS.EMPTY:
                        return FAILURES.SOURCE_IS_EMPTY;
                    case otherPlayCell:
                        return FAILURES.SOURCE_IS_OPPONENT;
                }
            }

            if (this._canEat(action)) {
                if (action.eats < 0)
                    return FAILURES.MUST_EAT;
                if (board[action.eats] !== otherPlayCell)
                    return FAILURES.MUST_EAT_FROM_OPPONENT;
                if (this.mills[action.eats] !== CELLS.EMPTY) {
                    for (let pos = 0; pos < POS_COUNT; pos++) {
                        const cell = board[pos], mill = this.mills[pos];
                        if (cell === otherPlayCell && mill === CELLS.EMPTY) {
                            return FAILURES.CANNOT_EAT_FROM_MILL;
                        }
                    }
                }
            }
        };

        // All "eating" variants of a given action.
        _withEat(action) {
            const ifOnlyMills = []
                , ifNotOnlyMills = []
                , eatable = CELLS.forOtherPlayer(this.player)
                , board = this.board;
            for (let pos = 0; pos < POS_COUNT; pos++) {
                if (board[pos] === eatable) {
                    const eat = new Action(action.to, action.from, pos);
                    ifOnlyMills.push(eat);
                    if (this.mills[pos] === CELLS.EMPTY) {
                        ifNotOnlyMills.push(eat);
                    }
                }
            }
            return (ifNotOnlyMills.length > 0) ? ifNotOnlyMills : ifOnlyMills;
        };

        _pushAllActionsFor(action, dest) {
            if (this._canEat(action)) {
                const actions = this._withEat(action)
                    , count = actions.length;
                for (let i = 0; i < count; i++) {
                    dest.push(actions[i]);
                }
            } else {
                dest.push(action);
            }
        }

        _finish(validate, lambda) {
            let res = this;
            while (res.stage !== STAGES.BLACKS_WON && res.stage !== STAGES.WHITES_WON) {
                res = new Game(res, lambda(res), validate);
            }
            return res;
        };

        possibleActions() {
            const player = this.player, stage = this.stage, board = this.board;

            if (stage === STAGES.WHITES_WON || stage === STAGES.BLACKS_WON)
                return [];

            if (stage === STAGES.PLACE) {
                const drops = [];
                for (let pos = 0; pos < POS_COUNT; pos++) {
                    if (board[pos] === CELLS.EMPTY) {
                        this._pushAllActionsFor(new Action(pos), drops);
                    }
                }
                return drops;
            }

            // We'll move or jump, let's enumerate positions for various piece types at once
            const ourCell = CELLS.forPlayer(this.player)
                , res = [];

            for (let from = 0; from < POS_COUNT; from++) {
                const cell = board[from];
                if (cell === ourCell) {
                    if (this.stage === STAGES.JUMP) {
                        for (let to = 0; to < POS_COUNT; to++) {
                            const cell2 = board[to];
                            if (cell2 === CELLS.EMPTY) {
                                this._pushAllActionsFor(new Action(to, from), res);
                            }
                        }
                    } else {
                        const neighbors = NEIGH[from];
                        for (let neigh = 0; neigh < neighbors.length; neigh++) {
                            const to = neighbors[neigh]
                                , cell2 = board[to];
                            if (cell2 === CELLS.EMPTY) {
                                this._pushAllActionsFor(new Action(to, from), res);
                            }
                        }
                    }
                }
            }

            return res;
        };

        after(action, validate) {
            if (typeof action === 'string')
                action = Action.fromString(action);
            return new Game(this, action, validate);
        };

        finishRandomly(validate) {
            return this._finish(validate, (game) => pickRandom(game.possibleActions()));
        };

        finishSemiRandomly(validate) {
            return this._finish(validate, (game) => {
                const moves = game.possibleActions();
                for (let i = 0; i < moves.length; i++) {
                    const move = moves[i];
                    if (move.eats >= 0)
                        return move;
                }
                return pickRandom(moves);
            });
        };
    }

    return ({
        newGame: () => new Game(),
        quickLoad: (str) => {
            let game = new Game();
            const parts = str.split(',');
            for (let i = 0; i < parts.length; i++) {
                game = game.after(parts[i], false);
                if (game.failure)
                    return game;
            }
            return game;
        },
        STAGES: STAGES,
        CELLS: CELLS,
        PLAYERS: PLAYERS,
        FAILURES: FAILURES
    });
})();
