// Course boards: the best rounds on each course, kept in browser storage, plus a full
// recording of the course record so it can be replayed as a ghost.
const KEY = (id) => `fc.board.${id}`;
const KEEP = 10;

function read(id) {
  try {
    const raw = localStorage.getItem(KEY(id));
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return { entries: [], ghost: null };
}

function write(id, board) {
  try {
    localStorage.setItem(KEY(id), JSON.stringify(board));
    return true;
  } catch {
    // probably out of room: keep the board, drop the bulky ghost recording
    try {
      localStorage.setItem(KEY(id), JSON.stringify({ ...board, ghost: null }));
    } catch { /* not saved */ }
    return false;
  }
}

export function boardFor(id) {
  return read(id);
}

// Add finished rounds to a course's board. Each round is { name, color, hand, strokes,
// toPar, scores, conditions, holes } where holes is the throw recording. Returns, per
// round, its place on the board (1-based, or 0 if it didn't make it) and whether it set
// a new course record.
export function addRounds(id, rounds) {
  const board = read(id);
  const results = [];
  const date = new Date().toISOString();
  // best first, so if two players both beat the record the better round becomes the ghost
  for (const r of [...rounds].sort((a, b) => a.strokes - b.strokes)) {
    const entry = { name: r.name, strokes: r.strokes, toPar: r.toPar, scores: r.scores, conditions: r.conditions, date };
    const recordBefore = board.entries[0]?.strokes ?? Infinity;
    board.entries.push(entry);
    board.entries.sort((a, b) => a.strokes - b.strokes || a.date.localeCompare(b.date));
    board.entries = board.entries.slice(0, KEEP);
    const place = board.entries.indexOf(entry) + 1;
    const record = r.strokes < recordBefore;
    if (record) {
      board.ghost = {
        name: r.name, color: r.color, hand: r.hand, strokes: r.strokes, toPar: r.toPar, scores: r.scores,
        conditions: r.conditions, date, holes: r.holes,
      };
    }
    results.push({ ref: r.ref, name: r.name, place, record });
  }
  write(id, board);
  return results;
}
