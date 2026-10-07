// Muestra la dirección para abrir la app desde tablets y móviles de la Wi-Fi.
// Distingue la tarjeta real (Wi-Fi / Ethernet) de los adaptadores virtuales
// (Hyper-V, WSL, VirtualBox, VPN…), cuyas direcciones no sirven para el móvil.
import os from "node:os";

const port = process.env.PORT ?? 3000;
const VIRTUAL = /área local\*|area local\*|local area connection\*|vethernet|virtualbox|vmware|hyper-v|wsl|docker|loopback|bluetooth|tailscale|zerotier|tap|tun|vpn|hamachi|radmin|vbox|veth|br-|virbr/i;
const isPrivate = (ip) => /^192\.168\./.test(ip) || /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

const candidates = Object.entries(os.networkInterfaces())
  .flatMap(([name, list]) => (list ?? []).filter((i) => i.family === "IPv4" && !i.internal).map((i) => ({ name, ip: i.address })))
  .map((c) => ({
    ...c,
    score: (VIRTUAL.test(c.name) ? -10 : 0) + (/^192\.168\./.test(c.ip) ? 3 : isPrivate(c.ip) ? 2 : 0) + (/wi-?fi|wlan|wireless|inal/i.test(c.name) ? 2 : /ethernet|eth|en\d/i.test(c.name) ? 1 : 0),
  }))
  .sort((a, b) => b.score - a.score);

const [best, ...others] = candidates;
console.log("\n  Jardón Ortopedia · Gestión clínica y taller");
console.log(`  ➜  En este equipo:   http://localhost:${port}`);
if (best) {
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────");
  console.log(`  │  EN EL MÓVIL ESCRIBA:   http://${best.ip}:${port}`);
  console.log(`  │  (conectado a la misma Wi-Fi · tarjeta «${best.name}»)`);
  console.log("  └─────────────────────────────────────────────────────────");
  if (others.length) {
    console.log("     Otras direcciones de este equipo (pruébelas solo si la de arriba no funciona):");
    for (const o of others) console.log(`       http://${o.ip}:${port}   (${o.name})`);
  }
  console.log("     ¿El móvil no la abre? Cierre esta ventana y haga doble clic en PERMITIR-MOVIL.bat");
} else {
  console.log("  [!] Este equipo no está conectado a ninguna red: el móvil no podrá conectarse.");
}
console.log("");
