import { expect, test } from 'bun:test';
import { palettes } from './appearance';
import { createShakeDetector, hasMotionData, randomOtherPalette, readShakePreference, requestMotionAccess } from './shakePalette';

const linear = x => ({acceleration:{x,y:0,z:0},accelerationIncludingGravity:null});
const gravity = x => ({acceleration:null,accelerationIncludingGravity:{x,y:0,z:9.8}});

test('missing, invalid and ordinary walking readings never change the palette', () => {
  const detector=createShakeDetector();
  expect(hasMotionData({acceleration:null,accelerationIncludingGravity:null})).toBe(false);
  expect(detector.push({acceleration:{x:NaN,y:0,z:0},accelerationIncludingGravity:null},0)).toBe(false);
  for(let time=20;time<3000;time+=20)expect(detector.push(linear(7*Math.sin(time/90)),time)).toBe(false);
});

test('three alternating impulses trigger once and a cooldown prevents rapid repeats', () => {
  const detector=createShakeDetector();
  expect(detector.push(linear(25),0)).toBe(false);
  expect(detector.push(linear(-28),120)).toBe(false);
  expect(detector.push(linear(27),240)).toBe(true);
  for(let time=360;time<2400;time+=120)expect(detector.push(linear(time%240?26:-26),time)).toBe(false);
  expect(detector.push(linear(25),2520)).toBe(false);
  expect(detector.push(linear(-25),2640)).toBe(false);
  expect(detector.push(linear(25),2760)).toBe(true);
});

test('single bumps, samples too close together and stale bursts are rejected', () => {
  const detector=createShakeDetector();
  expect(detector.push(linear(40),0)).toBe(false);
  expect(detector.push(linear(-40),20)).toBe(false);
  expect(detector.push(linear(40),40)).toBe(false);
  expect(detector.push(linear(-40),1000)).toBe(false);
  expect(detector.push(linear(40),2000)).toBe(false);
  const same=createShakeDetector();for(let time=0;time<1000;time+=100)expect(same.push(linear(40),time)).toBe(false);
});

test('gravity-only devices filter steady gravity and still detect a deliberate shake', () => {
  const detector=createShakeDetector();
  for(let time=0;time<=1000;time+=20)expect(detector.push(gravity(0),time)).toBe(false);
  expect(detector.push(gravity(35),1120)).toBe(false);
  expect(detector.push(gravity(-35),1240)).toBe(false);
  expect(detector.push(gravity(35),1360)).toBe(true);
  // Valid zero linear acceleration takes precedence over gravity noise.
  const rest=createShakeDetector();for(let time=0;time<1000;time+=100)expect(rest.push({acceleration:{x:0,y:0,z:0},accelerationIncludingGravity:{x:40*(time%200?1:-1),y:0,z:9.8}},time)).toBe(false);
});

test('orientation and visibility resets cannot complete an old half-shake', () => {
  const detector=createShakeDetector();detector.push(linear(30),0);detector.push(linear(-30),100);detector.reset();expect(detector.push(linear(30),200)).toBe(false);
  detector.pause(200);for(let time=300;time<1400;time+=100)expect(detector.push(linear(time%200?30:-30),time)).toBe(false);
  expect(detector.push(linear(30),1500)).toBe(false);expect(detector.push(linear(-30),1620)).toBe(false);expect(detector.push(linear(30),1740)).toBe(true);
});

test('random choice always excludes the current palette including edge random values', () => {
  for(const palette of palettes)for(const value of [0,.25,.5,.999999,1,NaN]){
    const next=randomOtherPalette(palette.id,()=>value);expect(next).not.toBe(palette.id);expect(palettes.some(item=>item.id===next)).toBe(true);
  }
});

test('permission requests preserve their receiver and never turn denial into a grant', async () => {
  const source={requestPermission(){expect(this).toBe(source);return Promise.resolve('denied');}};
  expect(await requestMotionAccess(source)).toBe('denied');
  expect(await requestMotionAccess({requestPermission:()=>Promise.resolve('granted')})).toBe('granted');
  expect(await requestMotionAccess({})).toBe('granted');
  await expect(requestMotionAccess({requestPermission:()=>Promise.reject(Error('blocked'))})).rejects.toThrow('blocked');
  expect(readShakePreference({getItem:()=>null})).toBe(false);expect(readShakePreference({getItem:()=> 'on'})).toBe(true);expect(readShakePreference({getItem:()=> 'off'})).toBe(false);expect(readShakePreference({getItem:()=>{throw Error('blocked')}})).toBe(false);
});
