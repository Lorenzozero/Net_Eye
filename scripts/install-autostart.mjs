// Rende lo scanner persistente al riavvio del PC, a LIVELLO UTENTE.
// Nessun privilegio di amministratore, nessun servizio di sistema critico:
//   • Windows → uno script .vbs nella cartella Esecuzione automatica (avvio nascosto)
//   • Linux   → un file .desktop in ~/.config/autostart (XDG)
//   • macOS   → un LaunchAgent in ~/Library/LaunchAgents
// Uso:  npm run autostart:install     (rimozione: npm run autostart:uninstall)
import os from 'node:os';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectDir = dirname(fileURLToPath(new URL('../server.mjs', import.meta.url)));
const serverPath = join(projectDir, 'server.mjs');
const home = os.homedir();

// Modalità: senza argomenti = server (default); con "--agent <url>" = agente che riporta a un server remoto.
const argv = process.argv.slice(2);
const ai = argv.indexOf('--agent');
const agentUrl = ai >= 0 ? argv[ai + 1] : null;
const extraStr = agentUrl ? ` --agent ${agentUrl}` : '';
const extraArr = agentUrl ? ['--agent', agentUrl] : [];
const modeLabel = agentUrl ? `agente → ${agentUrl}` : 'server (scanner locale)';

function installWindows() {
  const startup = join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const file = join(startup, 'NetworkScope.vbs');
  const log = join(projectDir, 'backend.log');
  // windowStyle 0 = avvio totalmente nascosto, output su backend.log
  const vbs =
    `Set sh = CreateObject("WScript.Shell")\r\n` +
    `sh.CurrentDirectory = "${projectDir}"\r\n` +
    `sh.Run "cmd /c node ""${serverPath}""${extraStr} > ""${log}"" 2>&1", 0, False\r\n`;
  writeFileSync(file, vbs);
  return file;
}

function installLinux() {
  const dir = join(home, '.config', 'autostart');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'networkscope.desktop');
  writeFileSync(file,
    `[Desktop Entry]\nType=Application\nName=NetworkScope Scanner\n` +
    `Exec=node "${serverPath}"${extraStr}\nPath=${projectDir}\nX-GNOME-Autostart-enabled=true\nNoDisplay=true\n`);
  return file;
}

function installMac() {
  const dir = join(home, 'Library', 'LaunchAgents');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'com.networkscope.scanner.plist');
  const progArgs = ['node', serverPath, ...extraArr].map((a) => `<string>${a}</string>`).join('');
  writeFileSync(file,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
    `<plist version="1.0"><dict>\n` +
    `  <key>Label</key><string>com.networkscope.scanner</string>\n` +
    `  <key>ProgramArguments</key><array>${progArgs}</array>\n` +
    `  <key>WorkingDirectory</key><string>${projectDir}</string>\n` +
    `  <key>RunAtLoad</key><true/>\n` +
    `</dict></plist>\n`);
  return file;
}

const installers = { win32: installWindows, linux: installLinux, darwin: installMac };
const fn = installers[process.platform];
if (!fn) { console.error('❌ Piattaforma non supportata:', process.platform); process.exit(1); }

const path = fn();
console.log(`✅ Autostart installato (livello utente, nessun permesso admin) — modalità: ${modeLabel}`);
console.log(`   ${path}`);
console.log('   Partirà automaticamente al prossimo login.');
console.log('   Rimozione:  npm run autostart:uninstall');
