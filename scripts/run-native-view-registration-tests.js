'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const swift = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktControlsModule.swift'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'lib/native-view-registry.ts'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const smoke = fs.readFileSync(path.join(root, 'app/native-control-smoke.tsx'), 'utf8');
const dialRoom = fs.readFileSync(path.join(root, 'components/classic/NorthStarV4Layer.tsx'), 'utf8');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const moduleName = swift.match(/Name\("([^"]+)"\)/)[1];
const views = [...swift.matchAll(/View\((\w+)\.self\)/g)].map((match) => match[1]);
const viewNames = [...swift.matchAll(/ViewName\("([^"]+)"\)/g)].map((match) => match[1]);

assert.strictEqual(moduleName, 'PocktControls');
assert.deepStrictEqual(views, ['PocktDialControl', 'PocktMechButton', 'PocktLampView', 'PocktReadout']);
assert.deepStrictEqual(viewNames, views);

function fabricName(index) {
  return index === 0 ? `ViewManagerAdapter_${moduleName}` : `ViewManagerAdapter_${moduleName}_${viewNames[index]}`;
}

const expected = {
  'modules/pockt-controls/src/PocktDialControl.tsx': `requireNativeViewManager<Props>('${moduleName}')`,
  'modules/pockt-controls/src/PocktMechButton.tsx': `requireNativeViewManager<Props>('${moduleName}', '${viewNames[1]}')`,
  'modules/pockt-controls/src/PocktLampView.tsx': `requireNativeViewManager<Props>('${moduleName}', '${viewNames[2]}')`,
  'modules/pockt-controls/src/PocktReadout.tsx': `requireNativeViewManager<Props>('${moduleName}', '${viewNames[3]}')`,
};

for (const [file, call] of Object.entries(expected)) {
  const source = read(file);
  assert.ok(source.includes(call), `${file} must call ${call}`);
  assert.ok(!source.includes("requireNativeViewManager<Props>('PocktDialControl')"), `${file} still asks for the build 156 dial name`);
  assert.ok(!source.includes("requireNativeViewManager<Props>('PocktMechButton')"), `${file} still asks for the build 156 button name`);
  assert.ok(!source.includes("requireNativeViewManager<Props>('PocktLampView')"), `${file} still asks for the build 156 lamp name`);
}

assert.ok(registry.includes('ViewManagerAdapter_${view.moduleName}_${view.viewName}'));
assert.ok(registry.includes('ViewManagerAdapter_${view.moduleName}'));
assert.ok(layout.includes('missingNativeViews()'), 'startup must refuse to render when a native view is unregistered');
assert.ok(layout.includes('native-view-registration-failure'));

for (const role of views) {
  assert.ok(smoke.includes(`<${role === 'PocktLampView' ? 'PocktLampView' : role}`), `smoke screen must mount ${role}`);
}
assert.ok(smoke.includes('<PocktDialControl'));
assert.ok(smoke.includes('<PocktMechButton'));
assert.ok(smoke.includes('<PocktLampView'));
assert.ok(smoke.includes('<PocktReadout'));
assert.ok(read('components/classic/FoundationDialRoom.tsx').includes('<PocktDialView'));
assert.ok(!read('components/classic/FoundationDialRoom.tsx').includes('<PocktDialControl'));
assert.ok(dialRoom.includes('<PocktMechButton') || dialRoom.includes('<Mech '));
assert.ok(dialRoom.includes('<PocktLampView'));
assert.ok(dialRoom.includes('<PocktReadout'));

const build156 = ["requireNativeViewManager<Props>('PocktDialControl')", "requireNativeViewManager<Props>('PocktMechButton')", "requireNativeViewManager<Props>('PocktLampView')"];
for (const call of build156) {
  const asked = call.match(/'([^']+)'/)[1];
  const exported = views.map((_, index) => fabricName(index));
  assert.ok(!exported.includes(`ViewManagerAdapter_${asked}`), `${call} must not match an exported Fabric name`);
}

console.log('native view registration contract passed');
console.log(views.map((view, index) => `${view} -> ${fabricName(index)}`).join('\n'));
