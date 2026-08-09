import React, { useEffect, useRef, useState } from 'react';

const COLS = 8;
const ROWS = 16;
const CELL = 20;
const TICK_MS = 600;
const LINE_SCORES = [0, 100, 300, 500, 800];

const SHAPES = {
  I: { color: '#00f0f0', rows: ['....', 'XXXX', '....', '....'] },
  O: { color: '#f0f000', rows: ['.XX.', '.XX.', '....', '....'] },
  T: { color: '#a000f0', rows: ['.X..', 'XXX.', '....', '....'] },
  S: { color: '#00f000', rows: ['.XX.', 'XX..', '....', '....'] },
  Z: { color: '#f00000', rows: ['XX..', '.XX.', '....', '....'] },
  J: { color: '#3060f0', rows: ['X...', 'XXX.', '....', '....'] },
  L: { color: '#f0a000', rows: ['..X.', 'XXX.', '....', '....'] },
};
const SHAPE_KEYS = Object.keys(SHAPES);
Object.values(SHAPES).forEach((shape) => {
  shape.matrix = shape.rows.map((row) => row.split('').map((ch) => ch === 'X'));
});

function randomShapeKey() {
  return SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)]; // NOSONAR - gameplay randomness only
}

function spawnPiece() {
  const key = randomShapeKey();
  const shape = SHAPES[key];
  return { matrix: shape.matrix, color: shape.color, row: 0, col: Math.floor((COLS - 4) / 2) };
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotateMatrix(matrix) {
  const n = matrix.length;
  const result = Array.from({ length: n }, () => Array(n).fill(false));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

function canPlace(board, matrix, row, col) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (bc < 0 || bc >= COLS || br >= ROWS) return false;
      if (br >= 0 && board[br][bc]) return false;
    }
  }
  return true;
}

function lockPiece(board, piece) {
  const newBoard = board.map((row) => row.slice());
  piece.matrix.forEach((row, r) => {
    row.forEach((filled, c) => {
      if (!filled) return;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) newBoard[br][bc] = piece.color;
    });
  });
  return newBoard;
}

function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - remaining.length;
  const freshRows = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...freshRows, ...remaining], cleared };
}

function stepDown(state) {
  const { board, piece } = state;
  if (canPlace(board, piece.matrix, piece.row + 1, piece.col)) {
    return { ...state, piece: { ...piece, row: piece.row + 1 } };
  }
  const locked = lockPiece(board, piece);
  const { board: clearedBoard, cleared } = clearLines(locked);
  const score = state.score + LINE_SCORES[cleared];
  const nextPiece = spawnPiece();
  const gameOver = !canPlace(clearedBoard, nextPiece.matrix, nextPiece.row, nextPiece.col);
  return { board: clearedBoard, piece: nextPiece, score, status: gameOver ? 'over' : 'playing' };
}

function buildDisplayGrid(board, piece, status) {
  const display = board.map((row) => row.slice());
  if (status !== 'playing') return display;
  piece.matrix.forEach((row, r) => {
    row.forEach((filled, c) => {
      if (!filled) return;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) display[br][bc] = piece.color;
    });
  });
  return display;
}

function initialState() {
  return { board: emptyBoard(), piece: spawnPiece(), score: 0, status: 'playing' };
}

export default function Tetris() {
  const stateRef = useRef(initialState());
  const hoveredRef = useRef(false);
  const [, setRenderTick] = useState(0);
  const forceRender = () => setRenderTick((t) => t + 1);

  useEffect(() => {
    if (stateRef.current.status !== 'playing') return undefined;
    const interval = setInterval(() => {
      stateRef.current = stepDown(stateRef.current);
      forceRender();
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [stateRef.current.status]);

  const moveHorizontal = (dir) => {
    const { board, piece } = stateRef.current;
    const newCol = piece.col + dir;
    if (canPlace(board, piece.matrix, piece.row, newCol)) {
      stateRef.current = { ...stateRef.current, piece: { ...piece, col: newCol } };
      forceRender();
    }
  };

  const rotate = () => {
    const { board, piece } = stateRef.current;
    const rotated = rotateMatrix(piece.matrix);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (canPlace(board, rotated, piece.row, piece.col + kick)) {
        stateRef.current = { ...stateRef.current, piece: { ...piece, matrix: rotated, col: piece.col + kick } };
        forceRender();
        return;
      }
    }
  };

  const softDrop = () => {
    stateRef.current = stepDown(stateRef.current);
    forceRender();
  };

  const applyAction = (action) => {
    if (stateRef.current.status !== 'playing') return;
    if (action === 'left') moveHorizontal(-1);
    else if (action === 'right') moveHorizontal(1);
    else if (action === 'rotate') rotate();
    else if (action === 'down') softDrop();
  };

  useEffect(() => {
    function handleKey(e) {
      if (!hoveredRef.current) return;
      const keyToAction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down' };
      const action = keyToAction[e.key];
      if (!action) return;
      e.preventDefault();
      applyAction(action);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const resetGame = () => {
    stateRef.current = initialState();
    forceRender();
  };

  const { board, piece, score, status } = stateRef.current;
  const display = buildDisplayGrid(board, piece, status);

  return (
    <div
      style={{ fontFamily: "'Source Sans Pro', sans-serif" }}
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      <h3 style={{ color: '#57B12D', margin: '0 0 6px 0', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: 'uppercase' }}>🧱 Tetris</h3>
      <p style={{ color: '#8b949e', fontSize: '12px', margin: '0 0 10px 0' }}>
        ← → move · ↑ rotate · ↓ drop faster · Score: {score}
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          style={{
            position: 'relative',
            width: COLS * CELL,
            height: ROWS * CELL,
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '6px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {display.map((row, r) =>
            row.map((color, c) => <div key={`${r}-${c}`} style={cellStyle(r, c, color)} />)
          )}
        </div>

        <div style={dpadStyle}>
          <div />
          <button style={dpadBtnStyle} onClick={() => applyAction('rotate')} aria-label="Rotate">⟳</button>
          <div />
          <button style={dpadBtnStyle} onClick={() => applyAction('left')} aria-label="Move left">◀</button>
          <button style={dpadBtnStyle} onClick={() => applyAction('down')} aria-label="Drop faster">▼</button>
          <button style={dpadBtnStyle} onClick={() => applyAction('right')} aria-label="Move right">▶</button>
        </div>
      </div>

      {status === 'over' && (
        <div style={overOverlayStyle}>
          <div style={{ fontSize: '36px' }}>💀📉</div>
          <p style={{ margin: '6px 0', fontWeight: 700 }}>Game over! Score: {score}</p>
          <button style={btnStyle} onClick={resetGame}>Try again</button>
        </div>
      )}
    </div>
  );
}

function cellStyle(row, col, color) {
  return {
    position: 'absolute',
    top: row * CELL,
    left: col * CELL,
    width: CELL,
    height: CELL,
    boxSizing: 'border-box',
    border: '1px solid #21262d',
    background: color || 'transparent',
  };
}

const dpadStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 32px)',
  gridTemplateRows: 'repeat(2, 32px)',
  gap: '4px',
  alignSelf: 'center',
};

const dpadBtnStyle = {
  background: '#21262d',
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  padding: 0,
};

const overOverlayStyle = {
  marginTop: '12px',
  padding: '14px',
  background: 'rgba(248, 81, 73, 0.15)',
  border: '1px solid #f85149',
  borderRadius: '8px',
  textAlign: 'center',
};

const btnStyle = {
  background: '#57B12D',
  color: '#0d1117',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 700,
};
