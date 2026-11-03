import {test} from 'node:test';import assert from 'node:assert/strict';import {tig,ages,oxygenIndex} from './clinical';
test('TIG: glicose 10%, 3mL/h, 1kg = 5mg/kg/min',()=>assert.equal(tig(10,3,1),5));
test('TIG rejeita divisão por zero e valores não finitos',()=>{assert.throws(()=>tig(10,3,0));assert.throws(()=>tig(NaN,3,1))});
test('IPM atravessa semana e idade corrigida preserva sinal',()=>{assert.equal(ages(29,3,12).pma,218);assert.equal(ages(29,3,12).corrected,-62)});
test('limiares gestacionais e dias inválidos',()=>{assert.equal(ages(37,0,0).category,'A termo');assert.equal(ages(27,6,0).category,'Prematuro extremo');assert.throws(()=>ages(30,7,0))});
test('IO usa FiO₂ em porcentagem e somente PaO₂ arterial',()=>{assert.equal(oxygenIndex(40,10,80,'Arterial'),5);assert.throws(()=>oxygenIndex(40,10,80,'Venosa'))});
