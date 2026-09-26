// Station key → set-piece factory. See ../README.md for the piece contract.
// 'drift' is deliberately absent: it means "no piece, just the global field".
import { createMarkPiece } from './mark.js';
import { createTunnelPiece } from './tunnel.js';
import { createRevealPiece } from './reveal.js';
import { createSequencePiece } from './sequence.js';
import { createLedgerPiece } from './ledger.js';
import { createLensPiece } from './lens.js';
import { createCrystalsPiece } from './crystals.js';
import { createCityPiece } from './city.js';
import { createBlocksPiece } from './blocks.js';

export const PIECES = {
  mark: createMarkPiece,
  tunnel: createTunnelPiece,
  reveal: createRevealPiece,
  sequence: createSequencePiece,
  ledger: createLedgerPiece,
  lens: createLensPiece,
  crystals: createCrystalsPiece,
  city: createCityPiece,
  blocks: createBlocksPiece,
};

export const STATION_KEYS = [...Object.keys(PIECES), 'drift'];
