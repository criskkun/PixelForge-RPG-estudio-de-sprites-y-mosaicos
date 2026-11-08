import { PalettePreset } from '../types';

export const RPG_PALETTES: PalettePreset[] = [
  {
    id: 'snes-chrono',
    name: '16-Bit SNES Classic',
    era: 'Super Nintendo / 90s JRPG',
    colors: [
      '#080010', '#201830', '#383050', '#585078', '#8880a8', '#c0b8d8', '#ffffff',
      '#781818', '#b82020', '#e84838', '#f88850', '#f8c068', '#f8f080',
      '#184818', '#287820', '#48a838', '#80d850', '#b8f870',
      '#103868', '#206098', '#3888c8', '#68b8e8', '#a8e0f8',
      '#482818', '#784828', '#b07040', '#d8a068', '#f8d098'
    ]
  },
  {
    id: 'gba-pokemon',
    name: 'GBA Emerald & Golden Sun',
    era: 'Game Boy Advance / 32-Bit Handheld',
    colors: [
      '#181018', '#302838', '#504860', '#787090', '#a8a0c0', '#e0d8f0', '#ffffff',
      '#802820', '#b83828', '#e85838', '#f88850', '#f8b868',
      '#185828', '#288840', '#48b860', '#78e888', '#b0f8b8',
      '#184878', '#2870b0', '#48a0e0', '#80d0f8', '#c0e8f8',
      '#583820', '#885830', '#c08848', '#e8b870', '#f8e0a8'
    ]
  },
  {
    id: 'endesga-32',
    name: 'EDG 32 (Modern Indie RPG)',
    era: 'Sea of Stars / Celeste / Modern Indie',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569'
    ]
  },
  {
    id: 'dark-gothic',
    name: 'Dark Gothic Roguelike',
    era: 'Darkest Dungeon / Blasphemous Top-Down',
    colors: [
      '#0d0b0e', '#1c171d', '#2c222b', '#44323d', '#614852', '#866872', '#b2979e', '#ded1d4',
      '#401116', '#6b1920', '#9c242c', '#c73c3c', '#e66b60',
      '#1c2826', '#2b3f3b', '#3d5951', '#5a7e72', '#86a89c',
      '#302c1f', '#4c4430', '#716545', '#9f8e5f', '#cbb886'
    ]
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon RPG',
    era: 'Neo-Tokyo / Synth RPG',
    colors: [
      '#050510', '#0e1124', '#1b1f3b', '#2c355e', '#45568d', '#ffffff',
      '#ff0055', '#ff2a85', '#ff66b2', '#ffb3d9',
      '#00f0ff', '#33f3ff', '#80f8ff', '#ccfcff',
      '#7928ca', '#9b51e0', '#bb6bd9', '#e0b0ff',
      '#ffe600', '#fff066', '#fff9b3'
    ]
  },
  {
    id: 'pico-8',
    name: 'PICO-8 Fantasy Console',
    era: '8-Bit Retro Mini',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  {
    id: 'gameboy-dmg',
    name: 'Game Boy DMG Original',
    era: '1989 Nintendo DMG-01',
    colors: [
      '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
    ]
  }
];

export function findClosestPaletteColor(hex: string, palette: string[]): string {
  if (!hex || hex === 'transparent' || hex === '') return '';
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  let minDistance = Infinity;
  let closestColor = palette[0] || '#000000';

  for (const pColor of palette) {
    const pClean = pColor.replace('#', '');
    const pr = parseInt(pClean.substring(0, 2), 16) || 0;
    const pg = parseInt(pClean.substring(2, 4), 16) || 0;
    const pb = parseInt(pClean.substring(4, 6), 16) || 0;

    // Weighted Euclidean distance (human eye is more sensitive to green)
    const dr = (r - pr) * 0.3;
    const dg = (g - pg) * 0.59;
    const db = (b - pb) * 0.11;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDistance) {
      minDistance = dist;
      closestColor = pColor;
    }
  }

  return closestColor;
}
