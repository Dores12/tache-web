var LZMA1 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // vstup-lzma.js
  var vstup_lzma_exports = {};
  __export(vstup_lzma_exports, {
    compress: () => compress
  });

  // node_modules/lzma1/lib/header.js
  var HEADER_SIZE = 13;
  var UNKNOWN_SIZE = -1;
  function roundDictSize(dictSize) {
    let d = dictSize - 1;
    d |= d >>> 2;
    d |= d >>> 3;
    d |= d >>> 4;
    d |= d >>> 8;
    d |= d >>> 16;
    return Math.min((d >>> 0) + 1, 4294967295);
  }
  function encodeHeader(header) {
    const bytes = new Uint8Array(HEADER_SIZE);
    const view = new DataView(bytes.buffer);
    bytes[0] = (header.pb * 5 + header.lp) * 9 + header.lc;
    view.setUint32(1, roundDictSize(header.dictSize), true);
    if (header.uncompressedSize === UNKNOWN_SIZE) {
      bytes.fill(255, 5);
    } else {
      view.setUint32(5, header.uncompressedSize % 4294967296, true);
      view.setUint32(9, Math.floor(header.uncompressedSize / 4294967296), true);
    }
    return bytes;
  }

  // node_modules/lzma1/lib/range-coder.js
  var TOP_VALUE = 1 << 24;
  var BIT_MODEL_TOTAL_BITS = 11;
  var BIT_MODEL_TOTAL = 1 << BIT_MODEL_TOTAL_BITS;
  var PROB_INIT = BIT_MODEL_TOTAL / 2;
  var MOVE_BITS = 5;
  function initProbs(probs) {
    probs.fill(PROB_INIT);
  }

  // node_modules/lzma1/lib/lzma-coder.js
  var POS_STATES_MAX = 1 << 4;
  var MATCH_LEN_MIN = 2;
  var LOW_SYMBOLS = 1 << 3;
  var MID_SYMBOLS = 1 << 3;
  var HIGH_SYMBOLS = 1 << 8;
  var MATCH_LEN_MAX = MATCH_LEN_MIN + LOW_SYMBOLS + MID_SYMBOLS + HIGH_SYMBOLS - 1;
  var LEN_CHOICE = 0;
  var LEN_CHOICE2 = 1;
  var LEN_LOW = 2;
  var LEN_MID = LEN_LOW + POS_STATES_MAX * LOW_SYMBOLS;
  var LEN_HIGH = LEN_MID + POS_STATES_MAX * MID_SYMBOLS;
  var LEN_SIZE = LEN_HIGH + HIGH_SYMBOLS;
  var DIST_STATES = 4;
  var DIST_SLOTS = 1 << 6;
  var DIST_SLOT_BITS = 6;
  var DIST_MODEL_START = 4;
  var DIST_MODEL_END = 14;
  var FULL_DISTANCES = 1 << DIST_MODEL_END / 2;
  var ALIGN_BITS = 4;
  var ALIGN_SIZE = 1 << ALIGN_BITS;
  var ALIGN_MASK = ALIGN_SIZE - 1;
  var REPS = 4;
  function getDistState(len) {
    return len < DIST_STATES + MATCH_LEN_MIN ? len - MATCH_LEN_MIN : DIST_STATES - 1;
  }
  function probsSize(lc, lp) {
    return LITERAL + (768 << lc + lp);
  }
  var State = class {
    constructor(other) {
      __publicField(this, "state", 0);
      if (other !== void 0) {
        this.state = other.state;
      }
    }
    reset() {
      this.state = LIT_LIT;
    }
    get() {
      return this.state;
    }
    set(other) {
      this.state = other.state;
    }
    updateLiteral() {
      this.state = stateAfterLiteral(this.state);
    }
    updateMatch() {
      this.state = stateAfterMatch(this.state);
    }
    updateLongRep() {
      this.state = stateAfterLongRep(this.state);
    }
    updateShortRep() {
      this.state = stateAfterShortRep(this.state);
    }
    isLiteral() {
      return isLiteralState(this.state);
    }
  };
  __publicField(State, "STATES", 12);
  var STATES = State.STATES;
  var LIT_STATES = 7;
  var LIT_LIT = 0;
  var SHORTREP_LIT_LIT = 3;
  var LIT_MATCH = 7;
  var LIT_LONGREP = 8;
  var LIT_SHORTREP = 9;
  var NONLIT_MATCH = 10;
  var NONLIT_REP = 11;
  function stateAfterLiteral(state) {
    if (state <= SHORTREP_LIT_LIT) {
      return LIT_LIT;
    } else if (state <= LIT_SHORTREP) {
      return state - 3;
    } else {
      return state - 6;
    }
  }
  function stateAfterMatch(state) {
    return state < LIT_STATES ? LIT_MATCH : NONLIT_MATCH;
  }
  function stateAfterLongRep(state) {
    return state < LIT_STATES ? LIT_LONGREP : NONLIT_REP;
  }
  function stateAfterShortRep(state) {
    return state < LIT_STATES ? LIT_SHORTREP : NONLIT_REP;
  }
  function isLiteralState(state) {
    return state < LIT_STATES;
  }
  var IS_MATCH = 0;
  var IS_REP = IS_MATCH + STATES * POS_STATES_MAX;
  var IS_REP0 = IS_REP + STATES;
  var IS_REP1 = IS_REP0 + STATES;
  var IS_REP2 = IS_REP1 + STATES;
  var IS_REP0_LONG = IS_REP2 + STATES;
  var DIST_SLOT_OFFSET = IS_REP0_LONG + STATES * POS_STATES_MAX;
  var DIST_SPECIAL = DIST_SLOT_OFFSET + DIST_STATES * DIST_SLOTS;
  var DIST_ALIGN = DIST_SPECIAL + FULL_DISTANCES - DIST_MODEL_END;
  var MATCH_LEN = DIST_ALIGN + ALIGN_SIZE;
  var REP_LEN = MATCH_LEN + LEN_SIZE;
  var LITERAL = REP_LEN + LEN_SIZE;
  function distSpecialOffset(distSlot, base) {
    return DIST_SPECIAL + base - distSlot - 1;
  }
  var LzmaCoder = class {
    /**
     * @param probs Probability array to reuse, of `probsSize(lc, lp)` entries.
     *        Its contents are overwritten by `reset()`.
     */
    constructor(lc, lp, pb, probs) {
      __publicField(this, "posMask");
      __publicField(this, "reps", new Int32Array(REPS));
      __publicField(this, "state", new State());
      __publicField(this, "probs");
      this.posMask = (1 << pb) - 1;
      this.probs = probs != null ? probs : new Uint16Array(probsSize(lc, lp));
    }
    reset() {
      this.reps[0] = 0;
      this.reps[1] = 0;
      this.reps[2] = 0;
      this.reps[3] = 0;
      this.state.reset();
      initProbs(this.probs);
    }
  };
  var LiteralCoder = class {
    constructor(lc, lp) {
      __publicField(this, "lc");
      __publicField(this, "literalPosMask");
      this.lc = lc;
      this.literalPosMask = (1 << lp) - 1;
    }
    getSubcoderIndex(prevByte, pos) {
      const low = prevByte >> 8 - this.lc;
      const high = (pos & this.literalPosMask) << this.lc;
      return low + high;
    }
  };
  var LiteralSubcoder = class {
    constructor(probs, literalOffset) {
      __publicField(this, "probs");
      /** Offset of this subcoder's 0x300 probabilities in `probs`. */
      __publicField(this, "literalOffset");
      this.probs = probs;
      this.literalOffset = literalOffset;
    }
  };
  var LengthCoder = class {
    constructor(probs, coder) {
      __publicField(this, "probs");
      /** Offset of this length coder in `probs`. */
      __publicField(this, "coder");
      this.probs = probs;
      this.coder = coder;
    }
  };

  // node_modules/lzma1/lib/crc32.js
  var CRC32_TABLE = createCrc32Table();
  function createCrc32Table() {
    const table = [];
    for (let i = 0; i < 256; ++i) {
      let r = i;
      for (let j = 0; j < 8; ++j) {
        r = (r & 1) !== 0 ? r >>> 1 ^ 3988292384 : r >>> 1;
      }
      table.push(r >>> 0);
    }
    return table;
  }

  // node_modules/lzma1/lib/lz-encoder.js
  var Matches = class {
    constructor(countMax) {
      __publicField(this, "len");
      /** Distances minus one (0 means the previous byte). */
      __publicField(this, "dist");
      __publicField(this, "count", 0);
      this.len = new Int32Array(countMax);
      this.dist = new Int32Array(countMax);
    }
  };
  function getMatchLen(buf, off, delta, len, lenLimit) {
    const end = off + lenLimit;
    let i = off + len;
    while (i < end && buf[i] === buf[i - delta]) {
      ++i;
    }
    return i - off;
  }
  function normalizePositions(positions, offset) {
    for (let i = 0; i < positions.length; ++i) {
      positions[i] = positions[i] <= offset ? 0 : positions[i] - offset;
    }
  }
  var LzEncoder = class {
    constructor(config) {
      __publicField(this, "keepSizeBefore");
      __publicField(this, "keepSizeAfter");
      __publicField(this, "matchLenMax");
      __publicField(this, "niceLen");
      __publicField(this, "buf");
      /** Position of the byte most recently returned by the match finder. */
      __publicField(this, "readPos", -1);
      __publicField(this, "readLimit", -1);
      __publicField(this, "finishing", false);
      __publicField(this, "writePos", 0);
      /** Bytes that were skipped because there wasn't enough lookahead yet. */
      __publicField(this, "pendingSize", 0);
      this.keepSizeBefore = config.extraSizeBefore + config.dictSize;
      this.keepSizeAfter = config.extraSizeAfter + config.matchLenMax;
      this.matchLenMax = config.matchLenMax;
      this.niceLen = config.niceLen;
      const reserveSize = Math.min((config.dictSize >>> 1) + (256 << 10), 512 << 20);
      let bufSize = this.keepSizeBefore + this.keepSizeAfter + reserveSize;
      if (config.inputSize !== void 0) {
        bufSize = Math.min(bufSize, config.inputSize + this.keepSizeAfter);
      }
      this.buf = new Uint8Array(bufSize);
    }
    /** Prepares the window for a new, independent input. */
    reset() {
      this.readPos = -1;
      this.readLimit = -1;
      this.finishing = false;
      this.writePos = 0;
      this.pendingSize = 0;
    }
    /**
     * Copies input into the window.
     *
     * @returns number of bytes consumed; call again with the rest
     */
    fillWindow(input, off, len) {
      if (this.readPos >= this.buf.length - this.keepSizeAfter) {
        this.moveWindow();
      }
      len = Math.min(len, this.buf.length - this.writePos);
      this.buf.set(input.subarray(off, off + len), this.writePos);
      this.writePos += len;
      if (this.writePos >= this.keepSizeAfter) {
        this.readLimit = this.writePos - this.keepSizeAfter;
      }
      this.processPendingBytes();
      return len;
    }
    /** Marks the end of input so that the lookahead can be used up. */
    setFinishing() {
      this.readLimit = this.writePos - 1;
      this.finishing = true;
      this.processPendingBytes();
    }
    isStarted() {
      return this.readPos !== -1;
    }
    /** True if there is enough input to encode more symbols. */
    hasEnoughData(alreadyReadLen) {
      return this.readPos - alreadyReadLen < this.readLimit;
    }
    /** Bytes available from the read position, including it. */
    getAvail() {
      return this.writePos - this.readPos;
    }
    getPos() {
      return this.readPos;
    }
    /** Byte `backward` positions before the read position. */
    getByte(backward) {
      return this.buf[this.readPos - backward];
    }
    /** Byte `backward` positions before `forward` bytes after the read position. */
    getByteAt(forward, backward) {
      return this.buf[this.readPos + forward - backward];
    }
    /** Length of the match at distance `dist` starting `forward` bytes ahead. */
    getMatchLen(forward, dist, lenLimit) {
      return getMatchLen(this.buf, this.readPos + forward, dist + 1, 0, lenLimit);
    }
    /**
     * Advances the read position.
     *
     * @returns number of bytes available, or 0 if the position must be
     *          processed later when more input has arrived
     */
    movePos(requiredForFlushing, requiredForFinishing) {
      ++this.readPos;
      let avail = this.writePos - this.readPos;
      if (avail < requiredForFlushing) {
        if (avail < requiredForFinishing || !this.finishing) {
          ++this.pendingSize;
          avail = 0;
        }
      }
      return avail;
    }
    moveWindow() {
      const moveOffset = this.readPos + 1 - this.keepSizeBefore & ~15;
      this.buf.copyWithin(0, moveOffset, this.writePos);
      this.readPos -= moveOffset;
      this.readLimit -= moveOffset;
      this.writePos -= moveOffset;
    }
    processPendingBytes() {
      if (this.pendingSize > 0 && this.readPos < this.readLimit) {
        this.readPos -= this.pendingSize;
        const oldPendingSize = this.pendingSize;
        this.pendingSize = 0;
        this.skip(oldPendingSize);
      }
    }
  };

  // node_modules/lzma1/lib/hash234.js
  var HASH_2_SIZE = 1 << 10;
  var HASH_2_MASK = HASH_2_SIZE - 1;
  var HASH_3_SIZE = 1 << 16;
  var HASH_3_MASK = HASH_3_SIZE - 1;
  var CRC32_TABLE_INT32 = Int32Array.from(CRC32_TABLE);
  function getHash4Size(dictSize) {
    let h = dictSize - 1;
    h |= h >>> 1;
    h |= h >>> 2;
    h |= h >>> 4;
    h |= h >>> 8;
    h >>>= 1;
    h |= 65535;
    if (h > 1 << 24) {
      h >>>= 1;
    }
    return h + 1;
  }
  var Hash234 = class {
    constructor(dictSize) {
      __publicField(this, "hash4Mask");
      __publicField(this, "hash2Table", new Int32Array(HASH_2_SIZE));
      __publicField(this, "hash3Table", new Int32Array(HASH_3_SIZE));
      __publicField(this, "hash4Table");
      __publicField(this, "hash2Value", 0);
      __publicField(this, "hash3Value", 0);
      __publicField(this, "hash4Value", 0);
      const hash4Size = getHash4Size(dictSize);
      this.hash4Table = new Int32Array(hash4Size);
      this.hash4Mask = hash4Size - 1;
    }
    calcHashes(buf, off) {
      let temp = CRC32_TABLE_INT32[buf[off]] ^ buf[off + 1];
      this.hash2Value = temp & HASH_2_MASK;
      temp ^= buf[off + 2] << 8;
      this.hash3Value = temp & HASH_3_MASK;
      temp ^= CRC32_TABLE_INT32[buf[off + 3]] << 5;
      this.hash4Value = temp & this.hash4Mask;
    }
    getHash2Pos() {
      return this.hash2Table[this.hash2Value];
    }
    getHash3Pos() {
      return this.hash3Table[this.hash3Value];
    }
    getHash4Pos() {
      return this.hash4Table[this.hash4Value];
    }
    updateTables(pos) {
      this.hash2Table[this.hash2Value] = pos;
      this.hash3Table[this.hash3Value] = pos;
      this.hash4Table[this.hash4Value] = pos;
    }
    clear() {
      this.hash2Table.fill(0);
      this.hash3Table.fill(0);
      this.hash4Table.fill(0);
    }
    normalize(offset) {
      normalizePositions(this.hash2Table, offset);
      normalizePositions(this.hash3Table, offset);
      normalizePositions(this.hash4Table, offset);
    }
  };

  // node_modules/lzma1/lib/bt4.js
  var MAX_POS = 2147483647;
  var BT4 = class extends LzEncoder {
    constructor(config) {
      super(config);
      __publicField(this, "hash");
      /** Two child links (smaller, larger) per position in the cyclic buffer. */
      __publicField(this, "tree");
      __publicField(this, "matches");
      __publicField(this, "depthLimit");
      __publicField(this, "cyclicSize");
      __publicField(this, "cyclicPos", -1);
      /** Position counter stored in the hash tables and tree. */
      __publicField(this, "lzPos");
      this.cyclicSize = config.dictSize + 1;
      this.lzPos = this.cyclicSize;
      this.hash = new Hash234(config.dictSize);
      this.tree = new Int32Array(this.cyclicSize * 2);
      this.matches = new Matches(config.niceLen - 1);
      this.depthLimit = config.depthLimit > 0 ? config.depthLimit : 16 + (config.niceLen >>> 1);
    }
    /**
     * Prepares for a new input without clearing the tables: positions
     * continue after the previous input, so its entries are too far back
     * (`delta >= cyclicSize`) and get ignored like empty ones.
     */
    reset() {
      super.reset();
      this.cyclicPos = -1;
      this.lzPos += this.cyclicSize;
      if (this.lzPos >= MAX_POS - this.cyclicSize) {
        this.hash.clear();
        this.tree.fill(0);
        this.lzPos = this.cyclicSize;
      }
    }
    getMatches() {
      const matches = this.matches;
      const buf = this.buf;
      matches.count = 0;
      let matchLenLimit = this.matchLenMax;
      let niceLenLimit = this.niceLen;
      const avail = this.movePosition();
      if (avail < matchLenLimit) {
        if (avail === 0)
          return matches;
        matchLenLimit = avail;
        if (niceLenLimit > avail)
          niceLenLimit = avail;
      }
      const readPos = this.readPos;
      this.hash.calcHashes(buf, readPos);
      let delta2 = this.lzPos - this.hash.getHash2Pos();
      const delta3 = this.lzPos - this.hash.getHash3Pos();
      const currentMatch = this.hash.getHash4Pos();
      this.hash.updateTables(this.lzPos);
      let lenBest = 0;
      if (delta2 < this.cyclicSize && buf[readPos - delta2] === buf[readPos]) {
        lenBest = 2;
        matches.len[0] = 2;
        matches.dist[0] = delta2 - 1;
        matches.count = 1;
      }
      if (delta2 !== delta3 && delta3 < this.cyclicSize && buf[readPos - delta3] === buf[readPos]) {
        lenBest = 3;
        matches.dist[matches.count++] = delta3 - 1;
        delta2 = delta3;
      }
      if (matches.count > 0) {
        lenBest = getMatchLen(buf, readPos, delta2, lenBest, matchLenLimit);
        matches.len[matches.count - 1] = lenBest;
        if (lenBest >= niceLenLimit) {
          this.updateTree(niceLenLimit, currentMatch);
          return matches;
        }
      }
      if (lenBest < 3)
        lenBest = 3;
      const tree = this.tree;
      const lzPos = this.lzPos;
      const cyclicPos = this.cyclicPos;
      const cyclicSize = this.cyclicSize;
      const matchLens = matches.len;
      const matchDists = matches.dist;
      let count = matches.count;
      let match = currentMatch;
      let depth = this.depthLimit;
      let ptr0 = (cyclicPos << 1) + 1;
      let ptr1 = cyclicPos << 1;
      let len0 = 0;
      let len1 = 0;
      while (true) {
        const delta = lzPos - match;
        if (depth-- === 0 || delta >= cyclicSize) {
          tree[ptr0] = 0;
          tree[ptr1] = 0;
          break;
        }
        const pair = cyclicPos - delta + (delta > cyclicPos ? cyclicSize : 0) << 1;
        const smaller = tree[pair];
        const larger = tree[pair + 1];
        let len = Math.min(len0, len1);
        if (buf[readPos + len - delta] === buf[readPos + len]) {
          len = getMatchLen(buf, readPos, delta, len + 1, matchLenLimit);
          if (len > lenBest) {
            lenBest = len;
            matchLens[count] = len;
            matchDists[count] = delta - 1;
            ++count;
            if (len >= niceLenLimit) {
              tree[ptr1] = smaller;
              tree[ptr0] = larger;
              break;
            }
          }
        }
        if (buf[readPos + len - delta] < buf[readPos + len]) {
          tree[ptr1] = match;
          ptr1 = pair + 1;
          match = larger;
          len1 = len;
        } else {
          tree[ptr0] = match;
          ptr0 = pair;
          match = smaller;
          len0 = len;
        }
      }
      matches.count = count;
      return matches;
    }
    skip(len) {
      while (len-- > 0) {
        let niceLenLimit = this.niceLen;
        const avail = this.movePosition();
        if (avail < niceLenLimit) {
          if (avail === 0)
            continue;
          niceLenLimit = avail;
        }
        this.hash.calcHashes(this.buf, this.readPos);
        const currentMatch = this.hash.getHash4Pos();
        this.hash.updateTables(this.lzPos);
        this.updateTree(niceLenLimit, currentMatch);
      }
    }
    /** Inserts the current position into the tree without collecting matches. */
    updateTree(niceLenLimit, currentMatch) {
      const buf = this.buf;
      const tree = this.tree;
      const readPos = this.readPos;
      const lzPos = this.lzPos;
      const cyclicPos = this.cyclicPos;
      const cyclicSize = this.cyclicSize;
      let match = currentMatch;
      let depth = this.depthLimit;
      let ptr0 = (cyclicPos << 1) + 1;
      let ptr1 = cyclicPos << 1;
      let len0 = 0;
      let len1 = 0;
      while (true) {
        const delta = lzPos - match;
        if (depth-- === 0 || delta >= cyclicSize) {
          tree[ptr0] = 0;
          tree[ptr1] = 0;
          return;
        }
        const pair = cyclicPos - delta + (delta > cyclicPos ? cyclicSize : 0) << 1;
        const smaller = tree[pair];
        const larger = tree[pair + 1];
        let len = Math.min(len0, len1);
        if (buf[readPos + len - delta] === buf[readPos + len]) {
          len = getMatchLen(buf, readPos, delta, len + 1, niceLenLimit);
          if (len === niceLenLimit) {
            tree[ptr1] = smaller;
            tree[ptr0] = larger;
            return;
          }
        }
        if (buf[readPos + len - delta] < buf[readPos + len]) {
          tree[ptr1] = match;
          ptr1 = pair + 1;
          match = larger;
          len1 = len;
        } else {
          tree[ptr0] = match;
          ptr0 = pair;
          match = smaller;
          len0 = len;
        }
      }
    }
    movePosition() {
      const avail = this.movePos(this.niceLen, 4);
      if (avail !== 0) {
        if (++this.lzPos === MAX_POS) {
          const offset = MAX_POS - this.cyclicSize;
          this.hash.normalize(offset);
          normalizePositions(this.tree, offset);
          this.lzPos -= offset;
        }
        if (++this.cyclicPos === this.cyclicSize) {
          this.cyclicPos = 0;
        }
      }
      return avail;
    }
  };

  // node_modules/lzma1/lib/hc4.js
  var MAX_POS2 = 2147483647;
  var HC4 = class extends LzEncoder {
    constructor(config) {
      super(config);
      __publicField(this, "hash");
      /** Previous position with the same hash, per position in the cyclic buffer. */
      __publicField(this, "chain");
      __publicField(this, "matches");
      __publicField(this, "depthLimit");
      __publicField(this, "cyclicSize");
      __publicField(this, "cyclicPos", -1);
      /** Position counter stored in the hash tables and chain. */
      __publicField(this, "lzPos");
      this.hash = new Hash234(config.dictSize);
      this.cyclicSize = config.dictSize + 1;
      this.chain = new Int32Array(this.cyclicSize);
      this.lzPos = this.cyclicSize;
      this.matches = new Matches(config.niceLen - 1);
      this.depthLimit = config.depthLimit > 0 ? config.depthLimit : 4 + (config.niceLen >>> 2);
    }
    /**
     * Prepares for a new input without clearing the tables: positions
     * continue after the previous input, so its entries are too far back
     * (`delta >= cyclicSize`) and get ignored like empty ones.
     */
    reset() {
      super.reset();
      this.cyclicPos = -1;
      this.lzPos += this.cyclicSize;
      if (this.lzPos >= MAX_POS2 - this.cyclicSize) {
        this.hash.clear();
        this.chain.fill(0);
        this.lzPos = this.cyclicSize;
      }
    }
    getMatches() {
      const matches = this.matches;
      const buf = this.buf;
      matches.count = 0;
      let matchLenLimit = this.matchLenMax;
      let niceLenLimit = this.niceLen;
      const avail = this.movePosition();
      if (avail < matchLenLimit) {
        if (avail === 0)
          return matches;
        matchLenLimit = avail;
        if (niceLenLimit > avail)
          niceLenLimit = avail;
      }
      const readPos = this.readPos;
      this.hash.calcHashes(buf, readPos);
      let delta2 = this.lzPos - this.hash.getHash2Pos();
      const delta3 = this.lzPos - this.hash.getHash3Pos();
      let match = this.hash.getHash4Pos();
      this.hash.updateTables(this.lzPos);
      this.chain[this.cyclicPos] = match;
      let lenBest = 0;
      if (delta2 < this.cyclicSize && buf[readPos - delta2] === buf[readPos]) {
        lenBest = 2;
        matches.len[0] = 2;
        matches.dist[0] = delta2 - 1;
        matches.count = 1;
      }
      if (delta2 !== delta3 && delta3 < this.cyclicSize && buf[readPos - delta3] === buf[readPos]) {
        lenBest = 3;
        matches.dist[matches.count++] = delta3 - 1;
        delta2 = delta3;
      }
      if (matches.count > 0) {
        lenBest = getMatchLen(buf, readPos, delta2, lenBest, matchLenLimit);
        matches.len[matches.count - 1] = lenBest;
        if (lenBest >= niceLenLimit)
          return matches;
      }
      if (lenBest < 3)
        lenBest = 3;
      let depth = this.depthLimit;
      while (true) {
        const delta = this.lzPos - match;
        if (depth-- === 0 || delta >= this.cyclicSize) {
          return matches;
        }
        match = this.chain[this.cyclicPos - delta + (delta > this.cyclicPos ? this.cyclicSize : 0)];
        if (buf[readPos + lenBest - delta] === buf[readPos + lenBest] && buf[readPos - delta] === buf[readPos]) {
          const len = getMatchLen(buf, readPos, delta, 1, matchLenLimit);
          if (len > lenBest) {
            lenBest = len;
            matches.len[matches.count] = len;
            matches.dist[matches.count] = delta - 1;
            ++matches.count;
            if (len >= niceLenLimit)
              return matches;
          }
        }
      }
    }
    skip(len) {
      while (len-- > 0) {
        if (this.movePosition() !== 0) {
          this.hash.calcHashes(this.buf, this.readPos);
          this.chain[this.cyclicPos] = this.hash.getHash4Pos();
          this.hash.updateTables(this.lzPos);
        }
      }
    }
    movePosition() {
      const avail = this.movePos(4, 4);
      if (avail !== 0) {
        if (++this.lzPos === MAX_POS2) {
          const offset = MAX_POS2 - this.cyclicSize;
          this.hash.normalize(offset);
          normalizePositions(this.chain, offset);
          this.lzPos -= offset;
        }
        if (++this.cyclicPos === this.cyclicSize) {
          this.cyclicPos = 0;
        }
      }
      return avail;
    }
  };

  // node_modules/lzma1/lib/range-encoder.js
  var MOVE_REDUCING_BITS = 4;
  var BIT_PRICE_SHIFT_BITS = 4;
  var bitPrices = createBitPriceTable();
  function createBitPriceTable() {
    const prices = createPriceTable();
    const half = prices.length;
    const table = new Uint32Array(2 * half);
    for (let i = 0; i < half; ++i) {
      table[i] = prices[i];
      table[half + i] = prices[half - 1 - i];
    }
    return table;
  }
  function createPriceTable() {
    const table = new Uint32Array(BIT_MODEL_TOTAL >>> MOVE_REDUCING_BITS);
    for (let i = (1 << MOVE_REDUCING_BITS) / 2; i < BIT_MODEL_TOTAL; i += 1 << MOVE_REDUCING_BITS) {
      let w = i;
      let bitCount = 0;
      for (let j = 0; j < BIT_PRICE_SHIFT_BITS; ++j) {
        w *= w;
        bitCount <<= 1;
        while ((w & 4294901760) !== 0) {
          w >>>= 1;
          ++bitCount;
        }
      }
      table[i >> MOVE_REDUCING_BITS] = (BIT_MODEL_TOTAL_BITS << BIT_PRICE_SHIFT_BITS) - 15 - bitCount;
    }
    return table;
  }
  function getBitPrice(prob, bit) {
    return bitPrices[bit << 7 | prob >>> MOVE_REDUCING_BITS];
  }
  function getBitTreePrice(probs, offset, bits, symbol) {
    let price = 0;
    symbol |= 1 << bits;
    do {
      const bit = symbol & 1;
      symbol >>>= 1;
      price += getBitPrice(probs[offset + symbol], bit);
    } while (symbol !== 1);
    return price;
  }
  function getReverseBitTreePrice(probs, offset, bits, symbol) {
    let price = 0;
    let index = 1;
    symbol |= 1 << bits;
    do {
      const bit = symbol & 1;
      symbol >>>= 1;
      price += getBitPrice(probs[offset + index], bit);
      index = index << 1 | bit;
    } while (symbol !== 1);
    return price;
  }
  function getDirectBitsPrice(count) {
    return count << BIT_PRICE_SHIFT_BITS;
  }
  var RangeEncoder = class {
    constructor(initialCapacity) {
      __publicField(this, "low", 0);
      __publicField(this, "range", 4294967295);
      __publicField(this, "cache", 0);
      /**
       * NOTE: int is OK for LZMA2 because a compressed chunk is not more
       * than 64 KiB, but with LZMA1 there is no chunking so in theory
       * cacheSize can grow very big. A JS number counts well past 2^32.
       */
      __publicField(this, "cacheSize", 1);
      // Instead of the fixed output array of RangeEncoderToBuffer, the
      // buffer grows on demand and the written bytes are handed out with
      // take()/finish(), because the compressed size isn't known in advance
      // here (contract adaptation).
      __publicField(this, "buf");
      __publicField(this, "size", 0);
      this.buf = new Uint8Array(Math.max(64, initialCapacity));
    }
    reset() {
      this.low = 0;
      this.range = 4294967295;
      this.cache = 0;
      this.cacheSize = 1;
    }
    /** Appends bytes that are not range coded, e.g. a header. */
    writeBytes(bytes) {
      this.ensureCapacity(bytes.length);
      this.buf.set(bytes, this.size);
      this.size += bytes.length;
    }
    /** Returns a copy of the output written so far and empties the buffer. */
    take() {
      const bytes = this.buf.slice(0, this.size);
      this.size = 0;
      return bytes;
    }
    /** Flushes all pending bytes and returns the rest of the output. */
    finish() {
      for (let i = 0; i < 5; ++i) {
        this.shiftLow();
      }
      return this.size === this.buf.length ? this.buf : this.buf.slice(0, this.size);
    }
    writeByte(b) {
      this.ensureCapacity(1);
      this.buf[this.size++] = b;
    }
    shiftLow() {
      const lowHi = Math.floor(this.low / 4294967296);
      if (lowHi !== 0 || this.low < 4278190080) {
        let temp = this.cache;
        do {
          this.writeByte(temp + lowHi);
          temp = 255;
        } while (--this.cacheSize !== 0);
        this.cache = this.low >>> 24 & 255;
      }
      ++this.cacheSize;
      this.low = (this.low & 16777215) * 256;
    }
    encodeBit(probs, index, bit) {
      const prob = probs[index];
      const bound = (this.range >>> BIT_MODEL_TOTAL_BITS) * prob;
      if (bit === 0) {
        this.range = bound;
        probs[index] = prob + (BIT_MODEL_TOTAL - prob >>> MOVE_BITS);
      } else {
        this.low += bound;
        this.range -= bound;
        probs[index] = prob - (prob >>> MOVE_BITS);
      }
      if (this.range < TOP_VALUE) {
        this.range = this.range << 8 >>> 0;
        this.shiftLow();
      }
    }
    encodeBitTree(probs, offset, bits, symbol) {
      let index = 1;
      let mask = 1 << bits;
      do {
        mask >>>= 1;
        const bit = symbol & mask;
        this.encodeBit(probs, offset + index, bit);
        index <<= 1;
        if (bit !== 0) {
          index |= 1;
        }
      } while (mask !== 1);
    }
    encodeReverseBitTree(probs, offset, bits, symbol) {
      let index = 1;
      symbol |= 1 << bits;
      do {
        const bit = symbol & 1;
        symbol >>>= 1;
        this.encodeBit(probs, offset + index, bit);
        index = index << 1 | bit;
      } while (symbol !== 1);
    }
    encodeDirectBits(value, count) {
      do {
        this.range >>>= 1;
        this.low += this.range & 0 - (value >>> --count & 1);
        if (this.range < TOP_VALUE) {
          this.range = this.range << 8 >>> 0;
          this.shiftLow();
        }
      } while (count !== 0);
    }
    ensureCapacity(extra) {
      if (this.size + extra > this.buf.length) {
        const grown = new Uint8Array(Math.max(this.size + extra, this.buf.length * 2));
        grown.set(this.buf.subarray(0, this.size));
        this.buf = grown;
      }
    }
  };

  // node_modules/lzma1/lib/lzma-encoder.js
  var DIST_PRICE_UPDATE_INTERVAL = FULL_DISTANCES;
  var ALIGN_PRICE_UPDATE_INTERVAL = ALIGN_SIZE;
  function getDistSlot(dist) {
    if (dist <= DIST_MODEL_START && dist >= 0) {
      return dist;
    }
    const i = 31 - Math.clz32(dist);
    return (i << 1) + (dist >>> i - 1 & 1);
  }
  var LzmaEncoder = class extends LzmaCoder {
    constructor(rc, lz, config) {
      super(config.lc, config.lp, config.pb);
      __publicField(this, "rc");
      __publicField(this, "lz");
      __publicField(this, "literalEncoder");
      __publicField(this, "matchLenEncoder");
      __publicField(this, "repLenEncoder");
      __publicField(this, "niceLen");
      __publicField(this, "distPriceCount", 0);
      __publicField(this, "alignPriceCount", 0);
      /** Whether a distance was encoded since the last reset. */
      __publicField(this, "distModelsUsed", false);
      /** Whether align bits were encoded since the last reset. */
      __publicField(this, "alignModelUsed", false);
      __publicField(this, "distSlotPricesSize");
      __publicField(this, "distSlotPrices");
      __publicField(this, "fullDistPrices", newPriceArray(DIST_STATES, FULL_DISTANCES));
      __publicField(this, "alignPrices", new Int32Array(ALIGN_SIZE));
      /**
       * Symbol chosen by `getNextSymbol()`:
       * -1 = literal, 0-3 = rep match, 4+ = match with distance `back - REPS`.
       */
      __publicField(this, "back", 0);
      /** Bytes the match finder is ahead of the encoder. Package-private in Java. */
      __publicField(this, "readAhead", -1);
      this.rc = rc;
      this.lz = lz;
      this.niceLen = config.niceLen;
      this.literalEncoder = new LiteralEncoder(this, config.lc, config.lp);
      this.matchLenEncoder = new LengthEncoder(this.probs, MATCH_LEN, config.pb, config.niceLen);
      this.repLenEncoder = new LengthEncoder(this.probs, REP_LEN, config.pb, config.niceLen);
      this.distSlotPricesSize = getDistSlot(config.dictSize - 1) + 1;
      this.distSlotPrices = newPriceArray(DIST_STATES, this.distSlotPricesSize);
      this.reset();
    }
    /**
     * Prepares for a new, independent input written to `rc` (contract
     * adaptation: lets a pooled encoder be reused by a later call).
     */
    restart(rc) {
      this.rc = rc;
      this.lz.reset();
      this.reset();
    }
    reset() {
      super.reset();
      this.matchLenEncoder.reset();
      this.repLenEncoder.reset();
      this.distPriceCount = 0;
      this.alignPriceCount = 0;
      this.distModelsUsed = false;
      this.alignModelUsed = false;
      this.readAhead = -1;
    }
    /** Compress for LZMA1. */
    encode() {
      if (!this.lz.isStarted() && !this.encodeInit()) {
        return;
      }
      while (this.encodeSymbol()) {
      }
    }
    encodeEndMarker() {
      const posState = this.lz.getPos() - this.readAhead & this.posMask;
      this.rc.encodeBit(this.probs, IS_MATCH + (this.state.get() << 4) + posState, 1);
      this.rc.encodeBit(this.probs, IS_REP + this.state.get(), 0);
      this.encodeMatch(-1, MATCH_LEN_MIN, posState);
    }
    encodeInit() {
      if (!this.lz.hasEnoughData(0)) {
        return false;
      }
      this.skip(1);
      this.rc.encodeBit(this.probs, IS_MATCH + (this.state.get() << 4), 0);
      this.literalEncoder.encodeInit(this.rc);
      --this.readAhead;
      return true;
    }
    encodeSymbol() {
      if (!this.lz.hasEnoughData(this.readAhead + 1)) {
        return false;
      }
      const len = this.getNextSymbol();
      const posState = this.lz.getPos() - this.readAhead & this.posMask;
      if (this.back === -1) {
        this.rc.encodeBit(this.probs, IS_MATCH + (this.state.get() << 4) + posState, 0);
        this.literalEncoder.encode(this.rc);
      } else {
        this.rc.encodeBit(this.probs, IS_MATCH + (this.state.get() << 4) + posState, 1);
        if (this.back < REPS) {
          this.rc.encodeBit(this.probs, IS_REP + this.state.get(), 1);
          this.encodeRepMatch(this.back, len, posState);
        } else {
          this.rc.encodeBit(this.probs, IS_REP + this.state.get(), 0);
          this.encodeMatch(this.back - REPS, len, posState);
        }
      }
      this.readAhead -= len;
      return true;
    }
    encodeMatch(dist, len, posState) {
      this.state.updateMatch();
      this.matchLenEncoder.encode(this.rc, len, posState);
      const distSlot = getDistSlot(dist);
      this.rc.encodeBitTree(this.probs, DIST_SLOT_OFFSET + (getDistState(len) << DIST_SLOT_BITS), DIST_SLOT_BITS, distSlot);
      this.distModelsUsed = true;
      if (distSlot >= DIST_MODEL_START) {
        const footerBits = (distSlot >>> 1) - 1;
        const base = (2 | distSlot & 1) << footerBits;
        const distReduced = dist - base;
        if (distSlot < DIST_MODEL_END) {
          this.rc.encodeReverseBitTree(this.probs, distSpecialOffset(distSlot, base), footerBits, distReduced);
        } else {
          this.rc.encodeDirectBits(distReduced >>> ALIGN_BITS, footerBits - ALIGN_BITS);
          this.rc.encodeReverseBitTree(this.probs, DIST_ALIGN, ALIGN_BITS, distReduced & ALIGN_MASK);
          this.alignModelUsed = true;
          --this.alignPriceCount;
        }
      }
      this.reps[3] = this.reps[2];
      this.reps[2] = this.reps[1];
      this.reps[1] = this.reps[0];
      this.reps[0] = dist;
      --this.distPriceCount;
    }
    encodeRepMatch(rep, len, posState) {
      if (rep === 0) {
        this.rc.encodeBit(this.probs, IS_REP0 + this.state.get(), 0);
        this.rc.encodeBit(this.probs, IS_REP0_LONG + (this.state.get() << 4) + posState, len === 1 ? 0 : 1);
      } else {
        const dist = this.reps[rep];
        this.rc.encodeBit(this.probs, IS_REP0 + this.state.get(), 1);
        if (rep === 1) {
          this.rc.encodeBit(this.probs, IS_REP1 + this.state.get(), 0);
        } else {
          this.rc.encodeBit(this.probs, IS_REP1 + this.state.get(), 1);
          this.rc.encodeBit(this.probs, IS_REP2 + this.state.get(), rep - 2);
          if (rep === 3) {
            this.reps[3] = this.reps[2];
          }
          this.reps[2] = this.reps[1];
        }
        this.reps[1] = this.reps[0];
        this.reps[0] = dist;
      }
      if (len === 1) {
        this.state.updateShortRep();
      } else {
        this.repLenEncoder.encode(this.rc, len, posState);
        this.state.updateLongRep();
      }
    }
    getMatches() {
      ++this.readAhead;
      return this.lz.getMatches();
    }
    skip(len) {
      this.readAhead += len;
      this.lz.skip(len);
    }
    getAnyMatchPrice(state, posState) {
      return getBitPrice(this.probs[IS_MATCH + (state << 4) + posState], 1);
    }
    getNormalMatchPrice(anyMatchPrice, state) {
      return anyMatchPrice + getBitPrice(this.probs[IS_REP + state], 0);
    }
    getAnyRepPrice(anyMatchPrice, state) {
      return anyMatchPrice + getBitPrice(this.probs[IS_REP + state], 1);
    }
    getShortRepPrice(anyRepPrice, state, posState) {
      return anyRepPrice + getBitPrice(this.probs[IS_REP0 + state], 0) + getBitPrice(this.probs[IS_REP0_LONG + (state << 4) + posState], 0);
    }
    getLongRepPrice(anyRepPrice, rep, state, posState) {
      let price = anyRepPrice;
      if (rep === 0) {
        price += getBitPrice(this.probs[IS_REP0 + state], 0) + getBitPrice(this.probs[IS_REP0_LONG + (state << 4) + posState], 1);
      } else {
        price += getBitPrice(this.probs[IS_REP0 + state], 1);
        if (rep === 1) {
          price += getBitPrice(this.probs[IS_REP1 + state], 0);
        } else {
          price += getBitPrice(this.probs[IS_REP1 + state], 1) + getBitPrice(this.probs[IS_REP2 + state], rep - 2);
        }
      }
      return price;
    }
    getLongRepAndLenPrice(rep, len, state, posState) {
      const anyMatchPrice = this.getAnyMatchPrice(state, posState);
      const anyRepPrice = this.getAnyRepPrice(anyMatchPrice, state);
      const longRepPrice = this.getLongRepPrice(anyRepPrice, rep, state, posState);
      return longRepPrice + this.repLenEncoder.getPrice(len, posState);
    }
    getDistPrice(distState, dist) {
      if (dist < FULL_DISTANCES) {
        return this.fullDistPrices[distState][dist];
      }
      const distSlot = getDistSlot(dist);
      return this.distSlotPrices[distState][distSlot] + this.alignPrices[dist & ALIGN_MASK];
    }
    getMatchAndLenPrice(normalMatchPrice, dist, len, posState) {
      return normalMatchPrice + this.matchLenEncoder.getPrice(len, posState) + this.getDistPrice(getDistState(len), dist);
    }
    updateDistPrices() {
      this.distPriceCount = DIST_PRICE_UPDATE_INTERVAL;
      if (this.distModelsUsed) {
        computeDistPrices(this.probs, this.distSlotPricesSize, this.distSlotPrices, this.fullDistPrices);
      } else {
        const initial = getInitialPrices();
        for (let distState = 0; distState < DIST_STATES; ++distState) {
          this.distSlotPrices[distState].set(initial.distSlotPrices[distState].subarray(0, this.distSlotPricesSize));
          this.fullDistPrices[distState].set(initial.fullDistPrices[distState]);
        }
      }
    }
    updateAlignPrices() {
      this.alignPriceCount = ALIGN_PRICE_UPDATE_INTERVAL;
      if (this.alignModelUsed) {
        computeAlignPrices(this.probs, this.alignPrices);
      } else {
        this.alignPrices.set(getInitialPrices().alignPrices);
      }
    }
    /**
     * Updates the lookup tables used for calculating match distance
     * and length prices. The updating is skipped for performance reasons
     * if the tables haven't changed much since the previous update.
     */
    updatePrices() {
      if (this.distPriceCount <= 0) {
        this.updateDistPrices();
      }
      if (this.alignPriceCount <= 0) {
        this.updateAlignPrices();
      }
      this.matchLenEncoder.updatePrices();
      this.repLenEncoder.updatePrices();
    }
  };
  function computeDistPrices(probs, distSlotPricesSize, distSlotPrices, fullDistPrices) {
    for (let distState = 0; distState < DIST_STATES; ++distState) {
      for (let distSlot = 0; distSlot < distSlotPricesSize; ++distSlot) {
        distSlotPrices[distState][distSlot] = getBitTreePrice(probs, DIST_SLOT_OFFSET + (distState << DIST_SLOT_BITS), DIST_SLOT_BITS, distSlot);
      }
      for (let distSlot = DIST_MODEL_END; distSlot < distSlotPricesSize; ++distSlot) {
        const count = (distSlot >>> 1) - 1 - ALIGN_BITS;
        distSlotPrices[distState][distSlot] += getDirectBitsPrice(count);
      }
      for (let dist2 = 0; dist2 < DIST_MODEL_START; ++dist2) {
        fullDistPrices[distState][dist2] = distSlotPrices[distState][dist2];
      }
    }
    let dist = DIST_MODEL_START;
    for (let distSlot = DIST_MODEL_START; distSlot < DIST_MODEL_END; ++distSlot) {
      const footerBits = (distSlot >>> 1) - 1;
      const base = (2 | distSlot & 1) << footerBits;
      const limit = 1 << footerBits;
      for (let i = 0; i < limit; ++i) {
        const distReduced = dist - base;
        const price = getReverseBitTreePrice(probs, distSpecialOffset(distSlot, base), footerBits, distReduced);
        for (let distState = 0; distState < DIST_STATES; ++distState) {
          fullDistPrices[distState][dist] = distSlotPrices[distState][distSlot] + price;
        }
        ++dist;
      }
    }
  }
  function computeAlignPrices(probs, alignPrices) {
    for (let i = 0; i < ALIGN_SIZE; ++i) {
      alignPrices[i] = getReverseBitTreePrice(probs, DIST_ALIGN, ALIGN_BITS, i);
    }
  }
  function newPriceArray(count, size) {
    return Array.from({ length: count }, () => new Int32Array(size));
  }
  var LiteralEncoder = class extends LiteralCoder {
    constructor(encoder, lc, lp) {
      super(lc, lp);
      __publicField(this, "encoder");
      __publicField(this, "subencoders");
      this.encoder = encoder;
      this.subencoders = Array.from({ length: 1 << lc + lp }, (_, i) => new LiteralSubencoder(encoder, LITERAL + 768 * i));
    }
    encodeInit(rc) {
      this.subencoders[0].encode(rc);
    }
    encode(rc) {
      const encoder = this.encoder;
      const i = this.getSubcoderIndex(encoder.lz.getByte(1 + encoder.readAhead), encoder.lz.getPos() - encoder.readAhead);
      this.subencoders[i].encode(rc);
    }
    getPrice(curByte, matchByte, prevByte, pos, state) {
      const encoder = this.encoder;
      let price = getBitPrice(encoder.probs[IS_MATCH + (state << 4) + (pos & encoder.posMask)], 0);
      const i = this.getSubcoderIndex(prevByte, pos);
      price += isLiteralState(state) ? this.subencoders[i].getNormalPrice(curByte) : this.subencoders[i].getMatchedPrice(curByte, matchByte);
      return price;
    }
  };
  var LiteralSubencoder = class extends LiteralSubcoder {
    constructor(encoder, literalOffset) {
      super(encoder.probs, literalOffset);
      __publicField(this, "encoder");
      this.encoder = encoder;
    }
    encode(rc) {
      const encoder = this.encoder;
      const probs = this.probs;
      let symbol = encoder.lz.getByte(encoder.readAhead) | 256;
      if (encoder.state.isLiteral()) {
        let subencoderIndex;
        let bit;
        do {
          subencoderIndex = symbol >>> 8;
          bit = symbol >>> 7 & 1;
          rc.encodeBit(probs, this.literalOffset + subencoderIndex, bit);
          symbol <<= 1;
        } while (symbol < 65536);
      } else {
        let matchByte = encoder.lz.getByte(encoder.reps[0] + 1 + encoder.readAhead);
        let offset = 256;
        let subencoderIndex;
        let matchBit;
        let bit;
        do {
          matchByte <<= 1;
          matchBit = matchByte & offset;
          subencoderIndex = offset + matchBit + (symbol >>> 8);
          bit = symbol >>> 7 & 1;
          rc.encodeBit(probs, this.literalOffset + subencoderIndex, bit);
          symbol <<= 1;
          offset &= ~(matchByte ^ symbol);
        } while (symbol < 65536);
      }
      encoder.state.updateLiteral();
    }
    getNormalPrice(symbol) {
      const probs = this.probs;
      let price = 0;
      let subencoderIndex;
      let bit;
      symbol |= 256;
      do {
        subencoderIndex = symbol >>> 8;
        bit = symbol >>> 7 & 1;
        price += getBitPrice(probs[this.literalOffset + subencoderIndex], bit);
        symbol <<= 1;
      } while (symbol < 256 << 8);
      return price;
    }
    getMatchedPrice(symbol, matchByte) {
      const probs = this.probs;
      let price = 0;
      let offset = 256;
      let subencoderIndex;
      let matchBit;
      let bit;
      symbol |= 256;
      do {
        matchByte <<= 1;
        matchBit = matchByte & offset;
        subencoderIndex = offset + matchBit + (symbol >>> 8);
        bit = symbol >>> 7 & 1;
        price += getBitPrice(probs[this.literalOffset + subencoderIndex], bit);
        symbol <<= 1;
        offset &= ~(matchByte ^ symbol);
      } while (symbol < 256 << 8);
      return price;
    }
  };
  var _LengthEncoder = class _LengthEncoder extends LengthCoder {
    constructor(probs, coder, pb, niceLen) {
      super(probs, coder);
      __publicField(this, "counters");
      __publicField(this, "prices");
      /** Whether a length was encoded since the last reset. */
      __publicField(this, "used", false);
      const posStates = 1 << pb;
      this.counters = new Int32Array(posStates);
      const lenSymbols = Math.max(niceLen - MATCH_LEN_MIN + 1, LOW_SYMBOLS + MID_SYMBOLS);
      this.prices = newPriceArray(posStates, lenSymbols);
    }
    reset() {
      this.counters.fill(0);
      this.used = false;
    }
    encode(rc, len, posState) {
      len -= MATCH_LEN_MIN;
      if (len < LOW_SYMBOLS) {
        rc.encodeBit(this.probs, this.coder + LEN_CHOICE, 0);
        rc.encodeBitTree(this.probs, this.coder + LEN_LOW + posState * LOW_SYMBOLS, 3, len);
      } else {
        rc.encodeBit(this.probs, this.coder + LEN_CHOICE, 1);
        len -= LOW_SYMBOLS;
        if (len < MID_SYMBOLS) {
          rc.encodeBit(this.probs, this.coder + LEN_CHOICE2, 0);
          rc.encodeBitTree(this.probs, this.coder + LEN_MID + posState * MID_SYMBOLS, 3, len);
        } else {
          rc.encodeBit(this.probs, this.coder + LEN_CHOICE2, 1);
          rc.encodeBitTree(this.probs, this.coder + LEN_HIGH, 8, len - MID_SYMBOLS);
        }
      }
      --this.counters[posState];
      this.used = true;
    }
    getPrice(len, posState) {
      return this.prices[posState][len - MATCH_LEN_MIN];
    }
    getPriceRow(posState) {
      return this.prices[posState];
    }
    updatePrices() {
      for (let posState = 0; posState < this.counters.length; ++posState) {
        if (this.counters[posState] <= 0) {
          this.counters[posState] = _LengthEncoder.PRICE_UPDATE_INTERVAL;
          this.updatePosStatePrices(posState);
        }
      }
    }
    updatePosStatePrices(posState) {
      if (this.used) {
        computeLengthPrices(this.probs, this.coder, posState, this.prices[posState]);
      } else {
        const prices = this.prices[posState];
        prices.set(getInitialPrices().lengthPrices.subarray(0, prices.length));
      }
    }
  };
  /**
   * The prices are updated after at least
   * `PRICE_UPDATE_INTERVAL` many lengths
   * have been encoded with the same posState.
   */
  __publicField(_LengthEncoder, "PRICE_UPDATE_INTERVAL", 32);
  var LengthEncoder = _LengthEncoder;
  function computeLengthPrices(probs, coder, posState, prices) {
    let choice0Price = getBitPrice(probs[coder + LEN_CHOICE], 0);
    let i = 0;
    for (; i < LOW_SYMBOLS; ++i) {
      prices[i] = choice0Price + getBitTreePrice(probs, coder + LEN_LOW + posState * LOW_SYMBOLS, 3, i);
    }
    choice0Price = getBitPrice(probs[coder + LEN_CHOICE], 1);
    let choice1Price = getBitPrice(probs[coder + LEN_CHOICE2], 0);
    for (; i < LOW_SYMBOLS + MID_SYMBOLS; ++i) {
      prices[i] = choice0Price + choice1Price + getBitTreePrice(probs, coder + LEN_MID + posState * MID_SYMBOLS, 3, i - LOW_SYMBOLS);
    }
    choice1Price = getBitPrice(probs[coder + LEN_CHOICE2], 1);
    for (; i < prices.length; ++i) {
      prices[i] = choice0Price + choice1Price + getBitTreePrice(probs, coder + LEN_HIGH, 8, i - LOW_SYMBOLS - MID_SYMBOLS);
    }
  }
  var initialPrices;
  function getInitialPrices() {
    if (initialPrices === void 0) {
      const probs = new Uint16Array(LITERAL);
      initProbs(probs);
      const distSlotPrices = newPriceArray(DIST_STATES, DIST_SLOTS);
      const fullDistPrices = newPriceArray(DIST_STATES, FULL_DISTANCES);
      computeDistPrices(probs, DIST_SLOTS, distSlotPrices, fullDistPrices);
      const alignPrices = new Int32Array(ALIGN_SIZE);
      computeAlignPrices(probs, alignPrices);
      const lengthPrices = new Int32Array(MATCH_LEN_MAX - MATCH_LEN_MIN + 1);
      computeLengthPrices(probs, MATCH_LEN, 0, lengthPrices);
      initialPrices = { distSlotPrices, fullDistPrices, alignPrices, lengthPrices };
    }
    return initialPrices;
  }

  // node_modules/lzma1/lib/lzma-encoder-fast.js
  var FAST_EXTRA_SIZE_BEFORE = 1;
  var FAST_EXTRA_SIZE_AFTER = MATCH_LEN_MAX - 1;
  function changePair(smallDist, bigDist) {
    return smallDist < bigDist >>> 7;
  }
  var LzmaEncoderFast = class extends LzmaEncoder {
    constructor() {
      super(...arguments);
      __publicField(this, "matches", null);
    }
    getNextSymbol() {
      if (this.readAhead === -1) {
        this.matches = this.getMatches();
      }
      this.back = -1;
      const avail = Math.min(this.lz.getAvail(), MATCH_LEN_MAX);
      if (avail < MATCH_LEN_MIN) {
        return 1;
      }
      let bestRepLen = 0;
      let bestRepIndex = 0;
      for (let rep = 0; rep < REPS; ++rep) {
        const len = this.lz.getMatchLen(0, this.reps[rep], avail);
        if (len < MATCH_LEN_MIN)
          continue;
        if (len >= this.niceLen) {
          this.back = rep;
          this.skip(len - 1);
          return len;
        }
        if (len > bestRepLen) {
          bestRepIndex = rep;
          bestRepLen = len;
        }
      }
      let mainLen = 0;
      let mainDist = 0;
      let matches = this.matches;
      if (matches.count > 0) {
        mainLen = matches.len[matches.count - 1];
        mainDist = matches.dist[matches.count - 1];
        if (mainLen >= this.niceLen) {
          this.back = mainDist + REPS;
          this.skip(mainLen - 1);
          return mainLen;
        }
        while (matches.count > 1 && mainLen === matches.len[matches.count - 2] + 1) {
          if (!changePair(matches.dist[matches.count - 2], mainDist))
            break;
          --matches.count;
          mainLen = matches.len[matches.count - 1];
          mainDist = matches.dist[matches.count - 1];
        }
        if (mainLen === MATCH_LEN_MIN && mainDist >= 128) {
          mainLen = 1;
        }
      }
      if (bestRepLen >= MATCH_LEN_MIN) {
        if (bestRepLen + 1 >= mainLen || bestRepLen + 2 >= mainLen && mainDist >= 1 << 9 || bestRepLen + 3 >= mainLen && mainDist >= 1 << 15) {
          this.back = bestRepIndex;
          this.skip(bestRepLen - 1);
          return bestRepLen;
        }
      }
      if (mainLen < MATCH_LEN_MIN || avail <= MATCH_LEN_MIN) {
        return 1;
      }
      matches = this.matches = this.getMatches();
      if (matches.count > 0) {
        const newLen = matches.len[matches.count - 1];
        const newDist = matches.dist[matches.count - 1];
        if (newLen >= mainLen && newDist < mainDist || newLen === mainLen + 1 && !changePair(mainDist, newDist) || newLen > mainLen + 1 || newLen + 1 >= mainLen && mainLen >= MATCH_LEN_MIN + 1 && changePair(newDist, mainDist)) {
          return 1;
        }
      }
      const limit = Math.max(mainLen - 1, MATCH_LEN_MIN);
      for (let rep = 0; rep < REPS; ++rep) {
        if (this.lz.getMatchLen(0, this.reps[rep], limit) === limit) {
          return 1;
        }
      }
      this.back = mainDist + REPS;
      this.skip(mainLen - 2);
      return mainLen;
    }
  };

  // node_modules/lzma1/lib/lzma-encoder-normal.js
  var OPTS = 4096;
  var NORMAL_EXTRA_SIZE_BEFORE = OPTS;
  var NORMAL_EXTRA_SIZE_AFTER = OPTS;
  var INFINITY_PRICE = 1 << 30;
  var Optimums = class {
    constructor(size) {
      /** The state after arriving here. */
      __publicField(this, "state");
      __publicField(this, "reps");
      /** Cumulative price of arriving to this byte. */
      __publicField(this, "price");
      __publicField(this, "optPrev");
      __publicField(this, "backPrev");
      __publicField(this, "prev1IsLiteral");
      __publicField(this, "hasPrev2");
      __publicField(this, "optPrev2");
      __publicField(this, "backPrev2");
      this.state = new Uint8Array(size);
      this.reps = new Int32Array(size * REPS);
      this.price = new Int32Array(size);
      this.optPrev = new Int32Array(size);
      this.backPrev = new Int32Array(size);
      this.prev1IsLiteral = new Uint8Array(size);
      this.hasPrev2 = new Uint8Array(size);
      this.optPrev2 = new Int32Array(size);
      this.backPrev2 = new Int32Array(size);
    }
    /** Resets the price. */
    reset(i) {
      this.price[i] = INFINITY_PRICE;
    }
    /** Sets to indicate one LZMA symbol (literal, rep, or match). */
    set1(i, newPrice, optCur, back) {
      this.price[i] = newPrice;
      this.optPrev[i] = optCur;
      this.backPrev[i] = back;
      this.prev1IsLiteral[i] = 0;
    }
    /** Sets to indicate two LZMA symbols of which the first one is a literal. */
    set2(i, newPrice, optCur, back) {
      this.price[i] = newPrice;
      this.optPrev[i] = optCur + 1;
      this.backPrev[i] = back;
      this.prev1IsLiteral[i] = 1;
      this.hasPrev2[i] = 0;
    }
    /**
     * Sets to indicate three LZMA symbols of which the second one
     * is a literal.
     */
    set3(i, newPrice, optCur, back2, len2, back) {
      this.price[i] = newPrice;
      this.optPrev[i] = optCur + len2 + 1;
      this.backPrev[i] = back;
      this.prev1IsLiteral[i] = 1;
      this.hasPrev2[i] = 1;
      this.optPrev2[i] = optCur;
      this.backPrev2[i] = back2;
    }
  };
  var LzmaEncoderNormal = class extends LzmaEncoder {
    constructor(rc, lz, config) {
      super(rc, lz, config);
      __publicField(this, "opts");
      __publicField(this, "optCur", 0);
      __publicField(this, "optEnd", 0);
      __publicField(this, "matches");
      // These are fields solely to avoid allocating the objects again and
      // again on each function call.
      __publicField(this, "repLens", new Int32Array(REPS));
      /** State after the symbols being priced, as in the Java code. */
      __publicField(this, "nextState", 0);
      const optsSize = Math.min(config.optsSize, OPTS);
      this.opts = new Optimums(optsSize);
    }
    reset() {
      this.optCur = 0;
      this.optEnd = 0;
      super.reset();
    }
    /**
     * Converts the opts array from backward indexes to forward indexes.
     * Then it will be simple to get the next symbol from the array
     * in later calls to `getNextSymbol()`.
     */
    convertOpts() {
      this.optEnd = this.optCur;
      let optPrev = this.opts.optPrev[this.optCur];
      do {
        const cur = this.optCur;
        if (this.opts.prev1IsLiteral[cur] !== 0) {
          this.opts.optPrev[optPrev] = this.optCur;
          this.opts.backPrev[optPrev] = -1;
          this.optCur = optPrev--;
          if (this.opts.hasPrev2[cur] !== 0) {
            this.opts.optPrev[optPrev] = optPrev + 1;
            this.opts.backPrev[optPrev] = this.opts.backPrev2[cur];
            this.optCur = optPrev;
            optPrev = this.opts.optPrev2[cur];
          }
        }
        const temp = this.opts.optPrev[optPrev];
        this.opts.optPrev[optPrev] = this.optCur;
        this.optCur = optPrev;
        optPrev = temp;
      } while (this.optCur > 0);
      this.optCur = this.opts.optPrev[0];
      this.back = this.opts.backPrev[this.optCur];
      return this.optCur;
    }
    getNextSymbol() {
      if (this.optCur < this.optEnd) {
        const len = this.opts.optPrev[this.optCur] - this.optCur;
        this.optCur = this.opts.optPrev[this.optCur];
        this.back = this.opts.backPrev[this.optCur];
        return len;
      }
      this.optCur = 0;
      this.optEnd = 0;
      this.back = -1;
      if (this.readAhead === -1) {
        this.matches = this.getMatches();
      }
      let avail = Math.min(this.lz.getAvail(), MATCH_LEN_MAX);
      if (avail < MATCH_LEN_MIN) {
        return 1;
      }
      let repBest = 0;
      for (let rep = 0; rep < REPS; ++rep) {
        this.repLens[rep] = this.lz.getMatchLen(0, this.reps[rep], avail);
        if (this.repLens[rep] < MATCH_LEN_MIN) {
          this.repLens[rep] = 0;
          continue;
        }
        if (this.repLens[rep] > this.repLens[repBest]) {
          repBest = rep;
        }
      }
      if (this.repLens[repBest] >= this.niceLen) {
        this.back = repBest;
        this.skip(this.repLens[repBest] - 1);
        return this.repLens[repBest];
      }
      let mainLen = 0;
      let mainDist = 0;
      if (this.matches.count > 0) {
        mainLen = this.matches.len[this.matches.count - 1];
        mainDist = this.matches.dist[this.matches.count - 1];
        if (mainLen >= this.niceLen) {
          this.back = mainDist + REPS;
          this.skip(mainLen - 1);
          return mainLen;
        }
      }
      const curByte = this.lz.getByte(0);
      const matchByte = this.lz.getByte(this.reps[0] + 1);
      if (mainLen < MATCH_LEN_MIN && curByte !== matchByte && this.repLens[repBest] < MATCH_LEN_MIN) {
        return 1;
      }
      let pos = this.lz.getPos();
      let posState = pos & this.posMask;
      {
        const prevByte = this.lz.getByte(1);
        const literalPrice = this.literalEncoder.getPrice(curByte, matchByte, prevByte, pos, this.state.get());
        this.opts.set1(1, literalPrice, 0, -1);
      }
      let anyMatchPrice = this.getAnyMatchPrice(this.state.get(), posState);
      let anyRepPrice = this.getAnyRepPrice(anyMatchPrice, this.state.get());
      if (matchByte === curByte) {
        const shortRepPrice = this.getShortRepPrice(anyRepPrice, this.state.get(), posState);
        if (shortRepPrice < this.opts.price[1]) {
          this.opts.set1(1, shortRepPrice, 0, 0);
        }
      }
      this.optEnd = Math.max(mainLen, this.repLens[repBest]);
      if (this.optEnd < MATCH_LEN_MIN) {
        this.back = this.opts.backPrev[1];
        return 1;
      }
      this.updatePrices();
      this.opts.state[0] = this.state.get();
      this.opts.reps.set(this.reps, 0);
      for (let i = this.optEnd; i >= MATCH_LEN_MIN; --i) {
        this.opts.reset(i);
      }
      for (let rep = 0; rep < REPS; ++rep) {
        let repLen = this.repLens[rep];
        if (repLen < MATCH_LEN_MIN) {
          continue;
        }
        const longRepPrice = this.getLongRepPrice(anyRepPrice, rep, this.state.get(), posState);
        do {
          const price = longRepPrice + this.repLenEncoder.getPrice(repLen, posState);
          if (price < this.opts.price[repLen]) {
            this.opts.set1(repLen, price, 0, rep);
          }
        } while (--repLen >= MATCH_LEN_MIN);
      }
      {
        let len = Math.max(this.repLens[0] + 1, MATCH_LEN_MIN);
        if (len <= mainLen) {
          const normalMatchPrice = this.getNormalMatchPrice(anyMatchPrice, this.state.get());
          let i = 0;
          while (len > this.matches.len[i]) {
            ++i;
          }
          while (true) {
            const dist = this.matches.dist[i];
            const price = this.getMatchAndLenPrice(normalMatchPrice, dist, len, posState);
            if (price < this.opts.price[len]) {
              this.opts.set1(len, price, 0, dist + REPS);
            }
            if (len === this.matches.len[i]) {
              if (++i === this.matches.count) {
                break;
              }
            }
            ++len;
          }
        }
      }
      avail = Math.min(this.lz.getAvail(), OPTS - 1);
      while (++this.optCur < this.optEnd) {
        this.matches = this.getMatches();
        if (this.matches.count > 0 && this.matches.len[this.matches.count - 1] >= this.niceLen) {
          break;
        }
        --avail;
        ++pos;
        posState = pos & this.posMask;
        this.updateOptStateAndReps();
        anyMatchPrice = this.opts.price[this.optCur] + this.getAnyMatchPrice(this.opts.state[this.optCur], posState);
        anyRepPrice = this.getAnyRepPrice(anyMatchPrice, this.opts.state[this.optCur]);
        this.calc1BytePrices(pos, posState, avail, anyRepPrice);
        if (avail >= MATCH_LEN_MIN) {
          const startLen = this.calcLongRepPrices(pos, posState, avail, anyRepPrice);
          if (this.matches.count > 0) {
            this.calcNormalMatchPrices(pos, posState, avail, anyMatchPrice, startLen);
          }
        }
      }
      return this.convertOpts();
    }
    /** Updates the state and reps for the current byte in the opts array. */
    updateOptStateAndReps() {
      let optPrev = this.opts.optPrev[this.optCur];
      if (this.opts.prev1IsLiteral[this.optCur] !== 0) {
        --optPrev;
        if (this.opts.hasPrev2[this.optCur] !== 0) {
          this.opts.state[this.optCur] = this.opts.state[this.opts.optPrev2[this.optCur]];
          if (this.opts.backPrev2[this.optCur] < REPS) {
            this.opts.state[this.optCur] = stateAfterLongRep(this.opts.state[this.optCur]);
          } else {
            this.opts.state[this.optCur] = stateAfterMatch(this.opts.state[this.optCur]);
          }
        } else {
          this.opts.state[this.optCur] = this.opts.state[optPrev];
        }
        this.opts.state[this.optCur] = stateAfterLiteral(this.opts.state[this.optCur]);
      } else {
        this.opts.state[this.optCur] = this.opts.state[optPrev];
      }
      if (optPrev === this.optCur - 1) {
        if (this.opts.backPrev[this.optCur] === 0) {
          this.opts.state[this.optCur] = stateAfterShortRep(this.opts.state[this.optCur]);
        } else {
          this.opts.state[this.optCur] = stateAfterLiteral(this.opts.state[this.optCur]);
        }
        const reps = this.opts.reps;
        const curRepsOffset = this.optCur * REPS;
        const prevRepsOffset = optPrev * REPS;
        reps[curRepsOffset] = reps[prevRepsOffset];
        reps[curRepsOffset + 1] = reps[prevRepsOffset + 1];
        reps[curRepsOffset + 2] = reps[prevRepsOffset + 2];
        reps[curRepsOffset + 3] = reps[prevRepsOffset + 3];
      } else {
        let back;
        if (this.opts.prev1IsLiteral[this.optCur] !== 0 && this.opts.hasPrev2[this.optCur] !== 0) {
          optPrev = this.opts.optPrev2[this.optCur];
          back = this.opts.backPrev2[this.optCur];
          this.opts.state[this.optCur] = stateAfterLongRep(this.opts.state[this.optCur]);
        } else {
          back = this.opts.backPrev[this.optCur];
          if (back < REPS) {
            this.opts.state[this.optCur] = stateAfterLongRep(this.opts.state[this.optCur]);
          } else {
            this.opts.state[this.optCur] = stateAfterMatch(this.opts.state[this.optCur]);
          }
        }
        if (back < REPS) {
          this.opts.reps[this.optCur * REPS] = this.opts.reps[optPrev * REPS + back];
          let rep;
          for (rep = 1; rep <= back; ++rep) {
            this.opts.reps[this.optCur * REPS + rep] = this.opts.reps[optPrev * REPS + rep - 1];
          }
          for (; rep < REPS; ++rep) {
            this.opts.reps[this.optCur * REPS + rep] = this.opts.reps[optPrev * REPS + rep];
          }
        } else {
          const reps = this.opts.reps;
          const curRepsOffset = this.optCur * REPS;
          const prevRepsOffset = optPrev * REPS;
          reps[curRepsOffset] = back - REPS;
          reps[curRepsOffset + 1] = reps[prevRepsOffset];
          reps[curRepsOffset + 2] = reps[prevRepsOffset + 1];
          reps[curRepsOffset + 3] = reps[prevRepsOffset + 2];
        }
      }
    }
    /** Calculates prices of a literal, a short rep, and literal + rep0. */
    calc1BytePrices(pos, posState, avail, anyRepPrice) {
      let nextIsByte = false;
      const curByte = this.lz.getByte(0);
      const matchByte = this.lz.getByte(this.opts.reps[this.optCur * REPS] + 1);
      const literalPrice = this.opts.price[this.optCur] + this.literalEncoder.getPrice(curByte, matchByte, this.lz.getByte(1), pos, this.opts.state[this.optCur]);
      if (literalPrice < this.opts.price[this.optCur + 1]) {
        this.opts.set1(this.optCur + 1, literalPrice, this.optCur, -1);
        nextIsByte = true;
      }
      if (matchByte === curByte && (this.opts.optPrev[this.optCur + 1] === this.optCur || this.opts.backPrev[this.optCur + 1] !== 0)) {
        const shortRepPrice = this.getShortRepPrice(anyRepPrice, this.opts.state[this.optCur], posState);
        if (shortRepPrice <= this.opts.price[this.optCur + 1]) {
          this.opts.set1(this.optCur + 1, shortRepPrice, this.optCur, 0);
          nextIsByte = true;
        }
      }
      if (!nextIsByte && matchByte !== curByte && avail > MATCH_LEN_MIN) {
        const lenLimit = Math.min(this.niceLen, avail - 1);
        const len = this.lz.getMatchLen(1, this.opts.reps[this.optCur * REPS], lenLimit);
        if (len >= MATCH_LEN_MIN) {
          this.nextState = this.opts.state[this.optCur];
          this.nextState = stateAfterLiteral(this.nextState);
          const nextPosState = pos + 1 & this.posMask;
          const price = literalPrice + this.getLongRepAndLenPrice(0, len, this.nextState, nextPosState);
          const i = this.optCur + 1 + len;
          while (this.optEnd < i) {
            this.opts.reset(++this.optEnd);
          }
          if (price < this.opts.price[i]) {
            this.opts.set2(i, price, this.optCur, 0);
          }
        }
      }
    }
    /**
     * Calculates prices of long rep and long rep + literal + rep0.
     */
    calcLongRepPrices(pos, posState, avail, anyRepPrice) {
      const opts = this.opts;
      const optPrice = opts.price;
      const optCur = this.optCur;
      const lz = this.lz;
      const repsOffset = optCur * REPS;
      const lenPrices = this.repLenEncoder.getPriceRow(posState);
      let startLen = MATCH_LEN_MIN;
      const lenLimit = Math.min(avail, this.niceLen);
      for (let rep = 0; rep < REPS; ++rep) {
        const dist = opts.reps[repsOffset + rep];
        const len = lz.getMatchLen(0, dist, lenLimit);
        if (len < MATCH_LEN_MIN) {
          continue;
        }
        while (this.optEnd < optCur + len) {
          opts.reset(++this.optEnd);
        }
        const longRepPrice = this.getLongRepPrice(anyRepPrice, rep, opts.state[optCur], posState);
        for (let i = len; i >= MATCH_LEN_MIN; --i) {
          const price = longRepPrice + lenPrices[i - MATCH_LEN_MIN];
          if (price < optPrice[optCur + i]) {
            opts.set1(optCur + i, price, optCur, rep);
          }
        }
        if (rep === 0) {
          startLen = len + 1;
        }
        let len2Limit = avail - len - 1;
        if (len2Limit < MATCH_LEN_MIN) {
          continue;
        }
        if (len2Limit > this.niceLen) {
          len2Limit = this.niceLen;
        }
        const len2 = lz.getMatchLen(len + 1, dist, len2Limit);
        if (len2 >= MATCH_LEN_MIN) {
          let price = longRepPrice + lenPrices[len - MATCH_LEN_MIN];
          this.nextState = opts.state[optCur];
          this.nextState = stateAfterLongRep(this.nextState);
          const curByte = lz.getByteAt(len, 0);
          const matchByte = lz.getByte(0);
          const prevByte = lz.getByteAt(len, 1);
          price += this.literalEncoder.getPrice(curByte, matchByte, prevByte, pos + len, this.nextState);
          this.nextState = stateAfterLiteral(this.nextState);
          const nextPosState = pos + len + 1 & this.posMask;
          price += this.getLongRepAndLenPrice(0, len2, this.nextState, nextPosState);
          const i = optCur + len + 1 + len2;
          while (this.optEnd < i) {
            opts.reset(++this.optEnd);
          }
          if (price < optPrice[i]) {
            opts.set3(i, price, optCur, rep, len, 0);
          }
        }
      }
      return startLen;
    }
    /**
     * Calculates prices of a normal match and normal match + literal + rep0.
     */
    calcNormalMatchPrices(pos, posState, avail, anyMatchPrice, startLen) {
      const matches = this.matches;
      const matchLens = matches.len;
      const matchDists = matches.dist;
      const opts = this.opts;
      const optPrice = opts.price;
      const optCur = this.optCur;
      const lz = this.lz;
      const lenPrices = this.matchLenEncoder.getPriceRow(posState);
      if (matchLens[matches.count - 1] > avail) {
        matches.count = 0;
        while (matchLens[matches.count] < avail) {
          ++matches.count;
        }
        matchLens[matches.count++] = avail;
      }
      const count = matches.count;
      if (matchLens[count - 1] < startLen) {
        return;
      }
      while (this.optEnd < optCur + matchLens[count - 1]) {
        opts.reset(++this.optEnd);
      }
      const normalMatchPrice = this.getNormalMatchPrice(anyMatchPrice, opts.state[optCur]);
      let match = 0;
      while (startLen > matchLens[match]) {
        ++match;
      }
      let dist = matchDists[match];
      let longMatchDistPrice = this.getDistPrice(DIST_STATES - 1, dist);
      for (let len = startLen; ; ++len) {
        const distPrice = len < DIST_STATES + MATCH_LEN_MIN - 1 ? this.getDistPrice(len - MATCH_LEN_MIN, dist) : longMatchDistPrice;
        const matchAndLenPrice = normalMatchPrice + lenPrices[len - MATCH_LEN_MIN] + distPrice;
        if (matchAndLenPrice < optPrice[optCur + len]) {
          opts.set1(optCur + len, matchAndLenPrice, optCur, dist + REPS);
        }
        if (len !== matchLens[match]) {
          continue;
        }
        let len2Limit = avail - len - 1;
        if (len2Limit >= MATCH_LEN_MIN) {
          if (len2Limit > this.niceLen) {
            len2Limit = this.niceLen;
          }
          const len2 = lz.getMatchLen(len + 1, dist, len2Limit);
          if (len2 >= MATCH_LEN_MIN) {
            this.nextState = opts.state[optCur];
            this.nextState = stateAfterMatch(this.nextState);
            const curByte = lz.getByteAt(len, 0);
            const matchByte = lz.getByte(0);
            const prevByte = lz.getByteAt(len, 1);
            let price = matchAndLenPrice + this.literalEncoder.getPrice(curByte, matchByte, prevByte, pos + len, this.nextState);
            this.nextState = stateAfterLiteral(this.nextState);
            const nextPosState = pos + len + 1 & this.posMask;
            price += this.getLongRepAndLenPrice(0, len2, this.nextState, nextPosState);
            const i = optCur + len + 1 + len2;
            while (this.optEnd < i) {
              opts.reset(++this.optEnd);
            }
            if (price < optPrice[i]) {
              opts.set3(i, price, optCur, dist + REPS, len, 0);
            }
          }
        }
        if (++match === count) {
          break;
        }
        dist = matchDists[match];
        longMatchDistPrice = this.getDistPrice(DIST_STATES - 1, dist);
      }
    }
  };

  // node_modules/lzma1/lib/options.js
  var DEFAULT_LEVEL = 5;
  var DICT_SIZE_MIN = 1 << 12;
  var DICT_SIZE_MAX = 768 << 20;
  var NICE_LEN_MIN = 8;
  var NICE_LEN_MAX = 273;
  var PRESETS = {
    1: { dictSize: 1 << 20, mode: "fast", matchFinder: "hc4", niceLen: 128, depth: 8 },
    2: { dictSize: 1 << 21, mode: "fast", matchFinder: "hc4", niceLen: 273, depth: 24 },
    3: { dictSize: 1 << 22, mode: "fast", matchFinder: "hc4", niceLen: 273, depth: 48 },
    4: { dictSize: 1 << 20, mode: "normal", matchFinder: "bt4", niceLen: 32, depth: 0 },
    5: { dictSize: 1 << 21, mode: "normal", matchFinder: "bt4", niceLen: 64, depth: 0 },
    6: { dictSize: 1 << 22, mode: "normal", matchFinder: "bt4", niceLen: 64, depth: 0 },
    7: { dictSize: 1 << 23, mode: "normal", matchFinder: "bt4", niceLen: 64, depth: 0 },
    8: { dictSize: 1 << 24, mode: "normal", matchFinder: "bt4", niceLen: 128, depth: 0 },
    9: { dictSize: 1 << 25, mode: "normal", matchFinder: "bt4", niceLen: 273, depth: 0 }
  };
  function resolveOptions(options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (typeof options !== "object") {
      options = { level: options };
    }
    const level = (_a = options.level) != null ? _a : DEFAULT_LEVEL;
    const preset = Object.hasOwn(PRESETS, level) ? PRESETS[level] : void 0;
    if (preset === void 0) {
      throw new RangeError(`Invalid compression level: ${level}`);
    }
    const resolved = {
      ...preset,
      lc: (_b = options.lc) != null ? _b : 3,
      lp: (_c = options.lp) != null ? _c : 0,
      pb: (_d = options.pb) != null ? _d : 2,
      dictSize: (_e = options.dictSize) != null ? _e : preset.dictSize,
      mode: (_f = options.mode) != null ? _f : preset.mode,
      niceLen: (_g = options.niceLen) != null ? _g : preset.niceLen,
      matchFinder: (_h = options.matchFinder) != null ? _h : preset.matchFinder,
      depth: (_i = options.depth) != null ? _i : preset.depth,
      endMarker: (_j = options.endMarker) != null ? _j : true
    };
    checkInteger("lc", resolved.lc, 0, 4);
    checkInteger("lp", resolved.lp, 0, 4);
    if (resolved.lc + resolved.lp > 4) {
      throw new RangeError(`Invalid lc + lp: ${resolved.lc + resolved.lp} (xz accepts at most 4)`);
    }
    checkInteger("pb", resolved.pb, 0, 4);
    checkInteger("dictSize", resolved.dictSize, DICT_SIZE_MIN, DICT_SIZE_MAX);
    checkInteger("niceLen", resolved.niceLen, NICE_LEN_MIN, NICE_LEN_MAX);
    checkInteger("depth", resolved.depth, 0, 2147483647);
    if (resolved.mode !== "fast" && resolved.mode !== "normal") {
      throw new RangeError(`Invalid mode: ${resolved.mode}`);
    }
    if (resolved.matchFinder !== "hc4" && resolved.matchFinder !== "bt4") {
      throw new RangeError(`Invalid matchFinder: ${resolved.matchFinder}`);
    }
    if (typeof resolved.endMarker !== "boolean") {
      throw new RangeError(`Invalid endMarker: ${resolved.endMarker} (expected a boolean)`);
    }
    return resolved;
  }
  function fitDictSize(dictSize, inputSize) {
    if (inputSize >= dictSize) {
      return dictSize;
    }
    for (let n = 12; n < 31; ++n) {
      if (1 << n >= inputSize)
        return Math.min(1 << n, dictSize);
      if ((1 << n) + (1 << n - 1) >= inputSize)
        return Math.min((1 << n) + (1 << n - 1), dictSize);
    }
    return dictSize;
  }
  function checkInteger(name, value, min, max) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new RangeError(`Invalid ${name}: ${value} (expected an integer ${min}-${max})`);
    }
  }

  // node_modules/lzma1/lib/alone-encoder.js
  var POOL_MAX_DICT_SIZE = 1 << 16;
  var POOL_MAX_ENTRIES = 3;
  var pool = /* @__PURE__ */ new Map();
  var AloneEncoder = class {
    /**
     * @param options Resolved compression options
     * @param uncompressedSize Total input size, or `UNKNOWN_SIZE` when streaming
     * @param reuse Take the encoder from, and return it to, the pool of
     *        small encoders. Only for synchronous one-shot compression.
     */
    constructor(options, uncompressedSize = UNKNOWN_SIZE, reuse = false) {
      __publicField(this, "rc");
      __publicField(this, "lzma");
      __publicField(this, "expectedSize");
      __publicField(this, "poolKey");
      __publicField(this, "endMarker");
      __publicField(this, "inputSize", 0);
      const knownSize = uncompressedSize !== UNKNOWN_SIZE;
      if (!knownSize && !options.endMarker) {
        throw new RangeError("Invalid endMarker: false (the end marker is required when the size is unknown, e.g. in a stream)");
      }
      const dictSize = knownSize ? fitDictSize(options.dictSize, uncompressedSize) : options.dictSize;
      this.expectedSize = uncompressedSize;
      this.endMarker = options.endMarker;
      this.rc = new RangeEncoder(knownSize ? Math.min(uncompressedSize >>> 1, 1 << 20) + 64 : 1 << 16);
      this.rc.writeBytes(encodeHeader({
        lc: options.lc,
        lp: options.lp,
        pb: options.pb,
        dictSize,
        uncompressedSize
      }));
      const sizeClass = knownSize ? 2 ** Math.ceil(Math.log2(Math.max(uncompressedSize, 64))) : void 0;
      if (reuse && knownSize && dictSize <= POOL_MAX_DICT_SIZE) {
        this.poolKey = [options.mode, options.matchFinder, options.niceLen, options.depth, options.lc, options.lp, options.pb, dictSize, sizeClass].join();
      }
      const pooled = this.poolKey === void 0 ? void 0 : pool.get(this.poolKey);
      if (pooled) {
        pool.delete(this.poolKey);
        pooled.restart(this.rc);
        this.lzma = pooled;
      } else {
        this.lzma = createEncoder(this.rc, options, dictSize, sizeClass);
      }
    }
    /** Compresses `input`. Output is buffered until `take()` or `finish()`. */
    write(input) {
      this.inputSize += input.length;
      if (this.expectedSize !== UNKNOWN_SIZE && this.inputSize > this.expectedSize) {
        throw new Error("Input exceeds the declared uncompressed size");
      }
      const lz = this.lzma.lz;
      let off = 0;
      while (off < input.length) {
        off += lz.fillWindow(input, off, input.length - off);
        this.lzma.encode();
      }
    }
    /** Returns the compressed bytes produced so far. */
    take() {
      return this.rc.take();
    }
    /** Compresses the remaining input, writes the end marker if enabled and returns the rest of the output. */
    finish() {
      if (this.expectedSize !== UNKNOWN_SIZE && this.inputSize !== this.expectedSize) {
        throw new Error("Input is smaller than the declared uncompressed size");
      }
      this.lzma.lz.setFinishing();
      this.lzma.encode();
      if (this.endMarker) {
        this.lzma.encodeEndMarker();
      }
      const output = this.rc.finish();
      if (this.poolKey !== void 0) {
        if (pool.size >= POOL_MAX_ENTRIES) {
          pool.delete(pool.keys().next().value);
        }
        pool.set(this.poolKey, this.lzma);
      }
      return output;
    }
  };
  function createEncoder(rc, options, dictSize, sizeClass) {
    const isFast = options.mode === "fast";
    const lzConfig = {
      dictSize,
      extraSizeBefore: isFast ? FAST_EXTRA_SIZE_BEFORE : NORMAL_EXTRA_SIZE_BEFORE,
      extraSizeAfter: isFast ? FAST_EXTRA_SIZE_AFTER : NORMAL_EXTRA_SIZE_AFTER,
      niceLen: options.niceLen,
      matchLenMax: MATCH_LEN_MAX,
      depthLimit: options.depth,
      inputSize: sizeClass
    };
    const lz = options.matchFinder === "hc4" ? new HC4(lzConfig) : new BT4(lzConfig);
    const lzmaConfig = {
      lc: options.lc,
      lp: options.lp,
      pb: options.pb,
      dictSize,
      niceLen: options.niceLen,
      // Positions of the optimum search never exceed the input size.
      optsSize: sizeClass === void 0 ? OPTS : sizeClass + 2
    };
    return isFast ? new LzmaEncoderFast(rc, lz, lzmaConfig) : new LzmaEncoderNormal(rc, lz, lzmaConfig);
  }

  // node_modules/lzma1/lib/lzma.js
  function toUint8Array(data) {
    if (data instanceof Uint8Array) {
      return data;
    }
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }
    throw new TypeError("Expected an ArrayBuffer or an ArrayBufferView");
  }
  function compressData(data, options = DEFAULT_LEVEL) {
    const encoder = new AloneEncoder(resolveOptions(options), data.length, true);
    encoder.write(data);
    return encoder.finish();
  }
  var PREALLOCATE_LIMIT = 64 << 20;

  // node_modules/lzma1/lib/index.js
  function compress(data, mode = DEFAULT_LEVEL) {
    return compressData(toUint8Array(data), mode);
  }
  return __toCommonJS(vstup_lzma_exports);
})();
/*! Bundled license information:

lzma1/lib/index.js:
  (**
   * @license
   * Copyright Filip Seman
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
