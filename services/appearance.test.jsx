import { expect, test } from 'bun:test';
import { DEFAULT_PALETTE, isDarkMode, nextTheme, paletteLongPress, palettes, readAppearance } from './appearance';
import { paletteBase, paletteTokens } from '../styles/paletteTokens.cjs';

test('Solarized is the only default and invalid or unavailable storage resolves to it', () => {
  expect(DEFAULT_PALETTE).toBe('solarized');
  expect(readAppearance({getItem:()=>null})).toEqual({mode:'system',palette:'solarized'});
  expect(readAppearance({getItem:()=>{throw Error('blocked')}})).toEqual({mode:'system',palette:'solarized'});
  expect(readAppearance({getItem:key=>key==='theme'?'dark':'midnight'})).toEqual({mode:'dark',palette:'midnight'});
  expect(readAppearance({getItem:()=> 'does-not-exist'})).toEqual({mode:'system',palette:'solarized'});
  expect(palettes.some(palette=>palette.id==='default')).toBe(false);
  expect(paletteBase()[':root']['--site-canvas']).toBe('#fdf6e3');
  expect(paletteBase()[':root.dark']['--site-canvas']).toBe('#002b36');
});

test('brightness and palette are independent, including system mode', () => {
  expect(isDarkMode('system',true)).toBe(true);expect(isDarkMode('light',true)).toBe(false);
  expect(isDarkMode('dark',false)).toBe(true);
  expect(nextTheme('system',false)).toBe('dark');expect(nextTheme('dark',false)).toBe('light');expect(nextTheme('light',false)).toBe('dark');expect(nextTheme('system',true)).toBe('light');
  expect(new Set(palettes.map(palette=>palette.id)).size).toBe(palettes.length);
  expect(palettes.map(palette=>palette.id)).toEqual(expect.arrayContaining(['solarized','midnight','monokai']));
});

const luminance = hex => {
  const values=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
};
const contrast = (a,b) => {const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
test('every light and dark palette has readable body and primary button text', () => {
  for (const palette of palettes) for (const mode of ['light','dark']) {
    const colors=palette[mode];
    expect(contrast(colors.text,colors.canvas),`${palette.id} ${mode} body`).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff',colors.primary),`${palette.id} ${mode} primary`).toBeGreaterThanOrEqual(4.5);
    const tokens=paletteTokens(colors,mode==='dark');expect(tokens['--site-canvas']).toBe(colors.canvas);
    expect(tokens[`--palette-gray-${mode==='dark'?900:50}`]).toBe(colors.canvas.slice(1).match(/../g).map(value=>parseInt(value,16)).join(' '));
  }
});

test('generated text, secondary text and links contrast with both canvas and elevated surfaces', () => {
  for (const palette of palettes) for (const mode of ['light', 'dark']) {
    const tokens = paletteTokens(palette[mode], mode === 'dark');
    for (const key of ['text', 'muted', 'accent']) for (const background of ['canvas', 'surface', 'code', ...(mode === 'dark' ? ['border'] : [])]) {
      expect(contrast(tokens[`--site-${key}`], tokens[`--site-${background}`]), `${palette.id} ${mode} ${key} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const key of ['comment', 'keyword', 'string', 'number', 'function']) {
      expect(contrast(tokens[`--site-${key}`], tokens['--site-code']), `${palette.id} ${mode} ${key} in code`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

function fakeClock() {
  let time=1000,id=0;const jobs=new Map();
  return {schedule(callback,delay){jobs.set(++id,{callback,due:time+delay});return id;},cancel(id){jobs.delete(id);},now:()=>time,advance(amount){time+=amount;for(const [id,job]of jobs)if(job.due<=time){jobs.delete(id);job.callback();}}};
}
test('touch long press opens once and consumes the following tap without changing brightness', () => {
  const clock=fakeClock();let opened=0;const states=[];const gesture=paletteLongPress(()=>opened++,clock,value=>states.push(value));
  expect(gesture.isHolding()).toBe(false);
  gesture.start('touch',10,10);clock.advance(549);expect(opened).toBe(0);clock.advance(1);expect(opened).toBe(1);
  expect(states).toEqual([false,true,false]);expect(gesture.isHolding()).toBe(false);
  gesture.cancel();expect(gesture.consumeClick()).toBe(true);expect(gesture.consumeClick()).toBe(false);clock.advance(1001);expect(gesture.consumeClick()).toBe(false);
});
test('short taps, scrolling, cancellation and mouse presses do not open the long-press picker', () => {
  const clock=fakeClock();let opened=0;const gesture=paletteLongPress(()=>opened++,clock);
  gesture.start('touch',0,0);clock.advance(100);gesture.cancel();clock.advance(1000);expect(opened).toBe(0);
  gesture.start('touch',0,0);gesture.move(20,0);clock.advance(1000);expect(opened).toBe(0);
  gesture.start('mouse',0,0);clock.advance(1000);expect(opened).toBe(0);
  gesture.start('pen',0,0);clock.advance(550);expect(opened).toBe(1);
});
