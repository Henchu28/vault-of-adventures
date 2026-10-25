import { expect, test } from 'bun:test';
import { CONTINENTS, mapLocation, regionsForContinent } from './map-geography';

test('there are exactly four numbered continents', () => {
  expect(CONTINENTS).toEqual([1, 2, 3, 4]);
});
test.each(['1', '2', '3'])('continent %s has nine regions', continent => {
  expect(regionsForContinent(continent)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
test('continent four has twelve regions', () => {
  expect(regionsForContinent('4')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});
test('Unknown continent always sets region to Unknown', () => {
  expect(mapLocation('unknown', '9')).toEqual({ continent: null, region: null });
});
test('region can be Unknown on a known continent', () => {
  expect(mapLocation('4', 'unknown')).toEqual({ continent: 4, region: null });
});
test('region twelve is only valid on continent four', () => {
  expect(mapLocation('3', '12')).toEqual({ continent: 3, region: null });
  expect(mapLocation('4', '12')).toEqual({ continent: 4, region: 12 });
});
test('NPC geography saves the same continent and region fields as maps', () => {
  expect(mapLocation('2', '9')).toEqual({ continent: 2, region: 9 });
  expect(mapLocation('unknown', '12')).toEqual({ continent: null, region: null });
});