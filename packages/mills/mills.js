"use strict";

const POS_COUNT = 24 // Number of positions on the board
    , PIECE_COUNT = 9 // Number of pieces for each player
    , CODE_FOR_A = 'A'.codePointAt(0);

// Picks a random element from an array
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const STAGES = {
    DROP: 'drop',
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
    WHITES: 0,
    BLACKS: 1
};

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

const POS = {
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5,
    G: 6, H: 7, I: 8, J: 9, K: 10, L: 11,
    M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17,
    S: 18, T: 19, U: 20, V: 21, W: 22, X: 23
};

//Triplets of positions forming lines
const LINES = [
    [POS.A, POS.B, POS.C],
    [POS.D, POS.E, POS.F],
    [POS.G, POS.H, POS.I],
    [POS.J, POS.K, POS.L],
    [POS.M, POS.N, POS.O],
    [POS.P, POS.Q, POS.R],
    [POS.S, POS.T, POS.U],
    [POS.V, POS.W, POS.X],
    [POS.A, POS.J, POS.V],
    [POS.D, POS.K, POS.S],
    [POS.G, POS.L, POS.P],
    [POS.B, POS.E, POS.H],
    [POS.Q, POS.T, POS.W],
    [POS.I, POS.M, POS.R],
    [POS.F, POS.N, POS.U],
    [POS.C, POS.O, POS.X]
];

const PEERS = [
    /*POS.A:*/ [POS.B, POS.C, POS.J, POS.V],
    /*POS.B:*/ [POS.A, POS.C, POS.E, POS.H],
    /*POS.C:*/ [POS.A, POS.B, POS.O, POS.X],
    /*POS.D:*/ [POS.E, POS.F, POS.K, POS.S],
    /*POS.E:*/ [POS.D, POS.F, POS.B, POS.H],
    /*POS.F:*/ [POS.D, POS.E, POS.N, POS.U],
    /*POS.G:*/ [POS.H, POS.I, POS.L, POS.P],
    /*POS.H:*/ [POS.G, POS.I, POS.B, POS.E],
    /*POS.I:*/ [POS.G, POS.H, POS.M, POS.R],
    /*POS.J:*/ [POS.K, POS.L, POS.A, POS.V],
    /*POS.K:*/ [POS.J, POS.L, POS.D, POS.S],
    /*POS.L:*/ [POS.J, POS.K, POS.G, POS.P],
    /*POS.M:*/ [POS.N, POS.O, POS.I, POS.R],
    /*POS.N:*/ [POS.M, POS.O, POS.F, POS.U],
    /*POS.O:*/ [POS.M, POS.N, POS.C, POS.X],
    /*POS.P:*/ [POS.Q, POS.R, POS.G, POS.L],
    /*POS.Q:*/ [POS.P, POS.R, POS.T, POS.W],
    /*POS.R:*/ [POS.P, POS.Q, POS.I, POS.M],
    /*POS.S:*/ [POS.T, POS.U, POS.D, POS.K],
    /*POS.T:*/ [POS.S, POS.U, POS.Q, POS.W],
    /*POS.U:*/ [POS.S, POS.T, POS.F, POS.N],
    /*POS.V:*/ [POS.W, POS.X, POS.A, POS.J],
    /*POS.W:*/ [POS.V, POS.X, POS.Q, POS.T],
    /*POS.X:*/ [POS.V, POS.W, POS.C, POS.O]];

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
        let res = String.fromCodePoint(CODE_FOR_A + this.to);
        if (this.from >= 0)
            res = String.fromCodePoint(CODE_FOR_A + this.from).concat(res);
        if (this.eats >= 0)
            res = res.concat('x', String.fromCodePoint(CODE_FOR_A + this.eats));
        return res;
    };

    static fromString(str) {
        const match = str.match(/^([A-X])?([A-X])(?:x([A-X]))?$/);
        if (match) {
            match[2] = match[2].codePointAt(0) - CODE_FOR_A;
            if (match[1])
                match[1] = match[1].codePointAt(0) - CODE_FOR_A;
            if (match[3])
                match[3] = match[3].codePointAt(0) - CODE_FOR_A;
            return new Action(match[2], match[1], match[3]);
        }
    };
}

class Game {
    cellsForPlayer() {
        return (this.player == PLAYERS.WHITES) ? CELLS.WHITES : CELLS.BLACKS;
    }

    cellsForOpponent() {
        return (this.player == PLAYERS.WHITES) ? CELLS.BLACKS : CELLS.WHITES;
    }

    constructor(parent, action, validate) {
        if (parent === undefined) {
            this.player = PLAYERS.WHITES; // whites start; mirrors chess
            this.stage = STAGES.DROP;
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
        let res;

        switch (this.stage) {
            case STAGES.BLACKS_WON:
            case STAGES.WHITES_WON:
                res = this.stage;
                break;
            default:
                if (this.failure) {
                    res = 'Failure: '.concat(this.failure);
                } else {
                    res = this.player === PLAYERS.WHITES ? 'Whites play' : 'Blacks play';
                }
        }

        res = res.concat('\nActions: ', this.actions.join(','));

        const cp = (pos) => {
            switch (this.board[pos]) {
                case CELLS.BLACKS:
                    return 'B';
                case CELLS.WHITES:
                    return 'W';
                default:
                    return '+';
            }
        };

        return res.concat('\n',
            cp(0), '-----', cp(1), '-----', cp(2), '\n| ',
            cp(3), '---', cp(4), '---', cp(5), ' |\n| | ',
            cp(6), '-', cp(7), '-', cp(8), ' | |\n',
            cp(9), '-', cp(10), '-', cp(11), '   ', cp(12), '-', cp(13), '-', cp(14), '\n| | ',
            cp(15), '-', cp(16), '-', cp(17), ' | |\n| ',
            cp(18), '---', cp(19), '---', cp(20), ' |\n',
            cp(21), '-----', cp(22), '-----', cp(23));
    };

    // Applies a trusted action
    _applyAction(action) {
        this.board[action.to] = this.cellsForPlayer();
        if (action.from >= 0)
            this.board[action.from] = CELLS.EMPTY;
        if (action.eats >= 0)
            this.board[action.eats] = CELLS.EMPTY;

        this.actions.push(action);

        if (this.actions.length < 2 * PIECE_COUNT) {
            this.stage = STAGES.DROP;
        } else {
            let blacksCount = 0
                , whitesCount = 0
                , blacksCanMove = false
                , whitesCanMove = false;
            for (let pos = 0; pos < this.board.length; pos++) {
                switch (this.board[pos]) {
                    case CELLS.BLACKS:
                        blacksCount++;
                        if (!blacksCanMove) {
                            const neighbors = NEIGH[pos];
                            for (let n = 0; n < neighbors.length; n++) {
                                if (this.board[neighbors[n]] === CELLS.EMPTY) {
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
                                if (this.board[neighbors[n]] === CELLS.EMPTY) {
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
                if ((this.player === PLAYERS.WHITES && blacksCount === 3) ||
                    (this.player === PLAYERS.BLACKS && whitesCount === 3))
                    this.stage = STAGES.JUMP;
                else
                    this.stage = STAGES.MOVE;
            }
        }

        this.mills = new Uint8Array(POS_COUNT);
        for (let i = 0; i < LINES.length; i++) {
            const l = LINES[i], a = l[0], b = l[1], c = l[2], exp = this.board[a];
            if (this.board[b] === exp && this.board[c] === exp) {
                this.mills[a] = exp;
                this.mills[b] = exp;
                this.mills[c] = exp;
            }
        }
    };

    // An action eats iff it creates a line of 3 cells when there wasn't one before.
    _canEat(action) {
        const req = this.cellsForPlayer()
            , peers = PEERS[action.to]
            , a = peers[0]
            , b = peers[1]
            , c = peers[2]
            , d = peers[3];

        return !!((a !== action.from && b !== action.from && this.board[a] === req && this.board[b] === req) ||
        (c !== action.from && d !== action.from && this.board[c] === req && this.board[d] === req));

    };

    // Returns a message explaining why a move is illegal, or undefined if it's legal
    _failureForAction(action) {
        const stage = this.stage;

        if (stage === STAGES.WHITES_WON || stage === STAGES.BLACKS_WON)
            return FAILURES.GAME_OVER;

        if (stage === STAGES.DROP) {
            if (action.type !== ACTION_TYPES.DROP)
                return FAILURES.SHOULD_DROP;
        } else {
            if (action.type === ACTION_TYPES.DROP)
                return FAILURES.CANNOT_DROP;
            else if (action.type === ACTION_TYPES.JUMP && stage === STAGES.MOVE)
                return FAILURES.CANNOT_JUMP;
        }
        if (this.board[action.to] !== CELLS.EMPTY) {
            return FAILURES.DEST_IS_NOT_EMPTY;
        }

        const otherPlayCell = this.cellsForOpponent();

        if (action.from >= 0) {
            switch (this.board[action.from]) {
                case CELLS.EMPTY:
                    return FAILURES.SOURCE_IS_EMPTY;
                case otherPlayCell:
                    return FAILURES.SOURCE_IS_OPPONENT;
            }
        }

        if (this._canEat(action)) {
            if (action.eats < 0)
                return FAILURES.MUST_EAT;
            if (this.board[action.eats] !== otherPlayCell)
                return FAILURES.MUST_EAT_FROM_OPPONENT;
            if (this.mills[action.eats] !== CELLS.EMPTY) {
                for (let pos = 0; pos < this.board.length; pos++) {
                    const cell = this.board[pos], mill = this.mills[pos];
                    if (cell === otherPlayCell && mill === CELLS.EMPTY) {
                        return FAILURES.CANNOT_EAT_FROM_MILL;
                    }
                }
            }
        }
    };

    // All "eating" variants of a given action.
    _withEat(action) {
        const withMills = []
            , noMills = []
            , eatable = this.cellsForOpponent();
        for (let pos = 0; pos < this.board.length; pos++) {
            if (this.board[pos] === eatable) {
                const eat = new Action(action.to, action.from, pos);
                withMills.push(eat);
                if (this.mills[pos] === CELLS.EMPTY) {
                    noMills.push(eat);
                }
            }
        }
        if (noMills.length > 0) {
            return noMills;
        } else {
            return withMills;
        }
    };

    _pushAllActionsFor(action, dest) {
        if (this._canEat(action)) {
            const actions = this._withEat(action);
            for (let i = 0; i < actions.length; i++) {
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
        if (this.stage === STAGES.WHITES_WON || this.stage === STAGES.BLACKS_WON)
            return [];

        if (this.stage === STAGES.DROP) {
            const drops = [];
            for (let pos = 0; pos < this.board.length; pos++) {
                if (this.board[pos] === CELLS.EMPTY) {
                    this._pushAllActionsFor(new Action(pos), drops);
                }
            }
            return drops;
        }

        // We'll move or jump, let's enumerate positions for various piece types at once
        const ourCell = this.cellsForPlayer()
            , res = [];

        for (let from = 0; from < this.board.length; from++) {
            const fromC = this.board[from];
            if (fromC === ourCell) {
                if (this.stage === STAGES.JUMP) {
                    for (let to = 0; to < this.board.length; to++) {
                        const toC = this.board[to];
                        if (toC === CELLS.EMPTY) {
                            this._pushAllActionsFor(new Action(to, from), res);
                        }
                    }
                } else {
                    const neighbors = NEIGH[from];
                    for (let n = 0; n < neighbors.length; n++) {
                        const to = neighbors[n]
                            , toC = this.board[to];
                        if (toC === CELLS.EMPTY) {
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

export let Mills = {
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
};