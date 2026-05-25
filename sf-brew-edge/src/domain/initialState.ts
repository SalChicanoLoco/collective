import { compileBreweryProfile } from './intakeCompiler';
import { TaproomState } from './types';

export const initialState: TaproomState = {
  role: 'Manager',
  activeView: 'Dashboard',
  intakeProfile: {
    venueName: 'Brian Demo Mode',
    painPoints: ['Rush line friction', 'Keg/tap changes', 'Manager visibility', 'PCI/payment risk'],
  },
  compiledProfile: compileBreweryProfile({
    venueName: 'Brian Demo Mode',
    painPoints: ['Rush line friction', 'Keg/tap changes', 'Manager visibility', 'PCI/payment risk'],
  }),
  rushMode: false,
  managerApprovedPromos: [],
  opsLog: [],
  taps: [
    { id: 'tap-1', name: 'North Wall 1', beer: { id: 'b-1', name: 'Desert IPA', style: 'IPA', abv: '6.8%' }, fillPct: 74, low: false, poursPerHour: 14 },
    { id: 'tap-2', name: 'North Wall 2', beer: { id: 'b-2', name: 'Noir Stout', style: 'Stout', abv: '7.2%' }, fillPct: 18, low: true, poursPerHour: 11 },
  ],
};
