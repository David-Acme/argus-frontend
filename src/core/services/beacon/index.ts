import type { IBeaconService } from '@/core/interfaces';
import { beaconService as beaconServiceImpl } from './beacon';

export const beaconService: IBeaconService = beaconServiceImpl;
