import { expect, test } from 'bun:test';
import { parsePriceFile } from './price-file';

test('parses name, price and annulments', () => {
  expect(parsePriceFile('Translúcido=3/0\nVeloz = 5 / 2').rows).toEqual([
    { name: 'Translúcido', cost: 3, required: 0 },
    { name: 'Veloz', cost: 5, required: 2 },
  ]);
});

test('annulments are optional and blank lines, comments and BOM are ignored', () => {
  const result = parsePriceFile('\uFEFF# precios\n\nFuerte=4\r\n');
  expect(result.errors).toEqual([]);
  expect(result.rows).toEqual([{ name: 'Fuerte', cost: 4, required: 0 }]);
});

test('reports invalid lines and duplicates with their line number', () => {
  const { errors } = parsePriceFile('Sin precio\nA=x/1\nB=1/1\nb=2/2');
  expect(errors.map(e => e.line)).toEqual([1, 2, 4]);
});
