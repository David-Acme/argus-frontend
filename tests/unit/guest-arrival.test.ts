import { describe, expect, test } from 'bun:test';
import { guestArrival, guestArrivalOptions } from '@/features/security/model/guest-arrival';

const environments = [
  { id: 1, name: 'Casa', cameraIds: [10, 11] },
  { id: 2, name: 'Tienda', cameraIds: [12] },
];
const cameras = [
  { id: '10', name: 'Puerta' },
  { id: '11', name: 'Patio' },
  { id: '12', name: 'Entrada' },
];

describe('guest arrival', () => {
  test('each placed camera is offered with its environment when there are several', () => {
    expect(guestArrivalOptions(environments, cameras)).toEqual([
      { value: '10', label: 'Puerta · Casa' },
      { value: '11', label: 'Patio · Casa' },
      { value: '12', label: 'Entrada · Tienda' },
    ]);
  });

  test('a single environment shows the camera name alone and skips unknown cameras', () => {
    expect(guestArrivalOptions([{ id: 1, name: 'Casa', cameraIds: [10, 99] }], cameras)).toEqual([
      { value: '10', label: 'Puerta' },
    ]);
  });

  test('the chosen camera carries the environment it belongs to, which the server requires', () => {
    expect(guestArrival('12', environments)).toEqual({ cameraId: 12, environmentId: 2 });
    expect(guestArrival('0', environments)).toBeNull();
    expect(guestArrival('99', environments)).toBeNull();
  });
});
