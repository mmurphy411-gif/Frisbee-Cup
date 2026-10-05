import { defineConfig } from 'vite';
import { party } from './net/party.js';

// Relative asset paths so the built game can be hosted from any folder. The party plugin
// relays Wi-Fi play between devices (npm run party serves the game to the network).
export default defineConfig({ base: './', plugins: [party()] });
