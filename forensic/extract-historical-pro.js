'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'recovered');
fs.mkdirSync(dir, { recursive: true });

const room = execSync('git show 21469e5:components/classic/ProRoom.tsx', {
  encoding: 'utf8',
  maxBuffer: 8e6,
});
const cells = execSync('git show 21469e5:components/classic/ProBeatCells.tsx', {
  encoding: 'utf8',
  maxBuffer: 8e6,
});
const from = "import { ProBeatCells } from '@/components/classic/ProBeatCells';";
const to = "import { ProBeatCells } from './HistoricalProBeatCells';";
if (!room.includes(from)) {
  throw new Error('historical ProRoom import not found');
}
fs.writeFileSync(path.join(dir, 'HistoricalProRoom.tsx'), room.replace(from, to));
fs.writeFileSync(path.join(dir, 'HistoricalProBeatCells.tsx'), cells);
console.log('extracted', room.split('\n').length, cells.split('\n').length);
