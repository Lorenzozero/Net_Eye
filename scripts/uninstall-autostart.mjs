// Rimuove l'autostart utente creato da install-autostart.mjs.
// Uso:  npm run autostart:uninstall
import os from 'node:os';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const home = os.homedir();
const targets = {
  win32: join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'NetworkScope.vbs'),
  linux: join(home, '.config', 'autostart', 'networkscope.desktop'),
  darwin: join(home, 'Library', 'LaunchAgents', 'com.networkscope.scanner.plist'),
};

const file = targets[process.platform];
if (!file) { console.error('❌ Piattaforma non supportata:', process.platform); process.exit(1); }

if (existsSync(file)) {
  rmSync(file);
  console.log(`✅ Autostart rimosso:\n   ${file}`);
} else {
  console.log('ℹ️  Nessun autostart trovato (già rimosso).');
}
