// test-weekend.mjs
// Unit test for the UTC weekend-drop rule. No network, no deps.
//
//   node test-weekend.mjs
//
// Exits 0 on success, 1 on any failed assertion.

import { isWeekendBar } from './weekend.mjs';

const cases = [
  // Friday 22:00 UTC — kept (last live hour before NY close)
  { iso: '2024-05-31T22:00:00Z', expectDrop: false, name: 'Fri 22:00 UTC' },
  { iso: '2024-05-31T13:00:00Z', expectDrop: false, name: 'Fri midday UTC' },
  // Saturday — always dropped
  { iso: '2024-06-01T00:00:00Z', expectDrop: true,  name: 'Sat 00:00 UTC' },
  { iso: '2024-06-01T12:00:00Z', expectDrop: true,  name: 'Sat midday UTC' },
  { iso: '2024-06-01T23:00:00Z', expectDrop: true,  name: 'Sat 23:00 UTC' },
  // Sunday before 21:00 — dropped (pre-open dead zone)
  { iso: '2024-06-02T00:00:00Z', expectDrop: true,  name: 'Sun 00:00 UTC' },
  { iso: '2024-06-02T10:00:00Z', expectDrop: true,  name: 'Sun 10:00 UTC' },
  { iso: '2024-06-02T20:59:59Z', expectDrop: true,  name: 'Sun 20:59 UTC' },
  // Sunday 21:00 onward — kept (Asia open)
  { iso: '2024-06-02T21:00:00Z', expectDrop: false, name: 'Sun 21:00 UTC (Asia open)' },
  { iso: '2024-06-02T22:00:00Z', expectDrop: false, name: 'Sun 22:00 UTC' },
  { iso: '2024-06-02T23:00:00Z', expectDrop: false, name: 'Sun 23:00 UTC' },
  // Monday — always kept
  { iso: '2024-06-03T00:00:00Z', expectDrop: false, name: 'Mon 00:00 UTC' },
  { iso: '2024-06-03T08:00:00Z', expectDrop: false, name: 'Mon 08:00 UTC' },
  // Cross-check accepting Date instances and epoch ms too
  {
    epoch: Date.UTC(2024, 5, 1, 12, 0, 0),
    expectDrop: true,
    name: 'Sat as epoch ms'
  },
  {
    epoch: Date.UTC(2024, 5, 3, 0, 0, 0),
    expectDrop: false,
    name: 'Mon as epoch ms'
  }
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const input = c.iso ? c.iso : c.epoch;
  const got = isWeekendBar(input);
  const ok = got === c.expectDrop;
  if (ok) {
    pass++;
    console.log(`✓ ${c.name.padEnd(34)}  drop=${got}`);
  } else {
    fail++;
    console.log(`✗ ${c.name.padEnd(34)}  drop=${got}  expected=${c.expectDrop}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
