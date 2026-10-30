import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  splitLightingEffects,
  readSplitLightingProfile,
  withSplitLightingMenus,
} from '../src/utils/zelvoq-split-lighting.ts';

const devices = {
  corne: [{name:'Corne (Zelvoq)'}, {vendorId:0x4653,productId:1}],
  sofle: [{name:'Sofle v1'}, {vendorId:0xfc32,productId:0x0287}],
  lily58: [{name:'Lily58 (Zelvoq)'}, {vendorId:0x04d8,productId:0xeb2d}],
};
const api = (version = 2) => ({
  calls: [],
  async getCustomMenuValue(...args) {
    this.calls.push(args);
    return [0x70,0x5a,0x51,version,3,0,0,...(version === 2 ? [0,0] : [])];
  },
});

test('compiled effect labels use the exact final firmware enum values', () => {
  assert.deepEqual(splitLightingEffects('corne'), ['All Off','Solid Color','Breathing','Cycle Left/Right','Rainbow Moving Chevron','Cycle Pinwheel','Solid Reactive Simple','Solid Reactive']);
  for (const model of ['sofle','lily58']) {
    const options = splitLightingEffects(model);
    assert.equal(options.length, model === 'sofle' ? 15 : 25);
    assert.equal(options[0], 'All Off');
    assert.equal(options[1], 'Solid Color');
    assert.equal(options[2], 'Breathing 1');
    assert.equal(options[5], 'Breathing 4');
    assert.equal(options[6], 'Rainbow Mood 1');
    assert.equal(options[8], 'Rainbow Mood 3');
    assert.equal(options[9], 'Rainbow Swirl 1');
    assert.equal(options[14], 'Rainbow Swirl 6');
    if (model === 'lily58') {
      assert.equal(options[15], 'Gradient 1');
      assert.equal(options[24], 'Gradient 10');
    } else {
      assert.equal(options.some(x => /Gradient|RGB Test|Alternating/.test(x)), false);
    }
    assert.equal(options.some(x => /Snake|Knight|Christmas|Twinkle/.test(x)), false);
  }
  assert.equal(splitLightingEffects('sofle').at(-1), 'Rainbow Swirl 6');
});

test('only exact split identity with a valid v2 signature enables the compiled profile', async () => {
  for (const [model, [definition, device]] of Object.entries(devices)) {
    const current = api();
    assert.equal(await readSplitLightingProfile(current, definition, device), model);
    assert.deepEqual(current.calls, [[[0,0x70], {reportErrors:false}]]);
    assert.equal(await readSplitLightingProfile(api(1), definition, device), null);
    const old = api();
    old.getCustomMenuValue = async () => { throw Error('Receiving incorrect response for command'); };
    assert.equal(await readSplitLightingProfile(old, definition, device), null);
  }
  for (const [definition, device] of [
    [{name:'Zelvoq 60 Plus'},{vendorId:0x1209,productId:3}],
    [{name:'Corne (Zelvoq)'},{vendorId:0x4653,productId:2}],
    [null,devices.corne[1]],
  ]) {
    const other = api();
    assert.equal(await readSplitLightingProfile(other, definition, device), null);
    assert.equal(other.calls.length,0);
  }
});

test('transport and malformed response errors do not silently enable a compiled profile', async () => {
  const error = new DOMException('USB disconnected','NetworkError');
  const broken = api();
  broken.getCustomMenuValue = async () => { throw error; };
  await assert.rejects(readSplitLightingProfile(broken,...devices.corne), candidate => candidate === error);
  const malformed = api();
  malformed.getCustomMenuValue = async () => [0x70,0x5a,0x51,2,3,0,0,2,0];
  await assert.rejects(readSplitLightingProfile(malformed,...devices.corne));
});

test('menu override preserves old firmware and updates only matching effect and color commands immutably', () => {
  const effect = {type:'dropdown', label:'Effect', content:['id_qmk_rgblight_effect',2,2], options:['legacy']};
  const color = {type:'color',label:'Color', content:['id_qmk_rgblight_color',2,4], showIf:'legacy test35'};
  const menus = [{label:'Lighting',content:[{label:'Underglow',content:[effect,color,{...effect,content:['another',2,2]}]}]}];
  const original = structuredClone(menus);
  assert.equal(withSplitLightingMenus(menus,null),menus);
  const updated = withSplitLightingMenus(menus,'sofle');
  const controls = updated[0].content[0].content;
  assert.deepEqual(controls[0].options,splitLightingEffects('sofle'));
  assert.equal(controls[1].showIf,'{id_qmk_rgblight_effect} != 0 && {id_qmk_rgblight_effect} != 25');
  assert.deepEqual(controls[2].options,['legacy']);
  assert.deepEqual(menus,original);
  const matrix = [{type:'dropdown', content:['id_qmk_rgb_matrix_effect',3,2], options:['legacy']},{type:'color',content:['id_qmk_rgb_matrix_color',3,4],showIf:'generic old modes'}];
  assert.deepEqual(withSplitLightingMenus(matrix,'corne')[0].options,splitLightingEffects('corne'));
  assert.equal(withSplitLightingMenus(matrix,'corne')[1].showIf,'{id_qmk_rgb_matrix_effect} != 0');
  assert.equal(withSplitLightingMenus(menus,'lily58')[0].content[0].content[1].showIf,'{id_qmk_rgblight_effect} != 0');
});
