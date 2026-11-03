import test from 'node:test';
import assert from 'node:assert/strict';
import {contrast,checkThemeContrasts} from '../scripts/check-theme-contrast.mjs';

test('contrast calculation uses WCAG relative luminance, not raw RGB distance',()=>{
 assert.equal(contrast([0,0,0],[255,255,255]),21);
 assert.equal(contrast([50,50,50],[50,50,50]),1);
 assert.ok(Math.abs(contrast([0,107,128],[255,255,255])-6)<1);
});
test('semantic text, states, controls and focus meet their contrast thresholds in both themes',()=>{
 const results=checkThemeContrasts();
 assert.ok(results.length>=40);
 assert.deepEqual(results.filter(result=>!result.pass),[]);
});
