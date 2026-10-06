// Muestra las direcciones para abrir la app desde tablets y móviles de la Wi-Fi.
import os from "node:os";

const port = process.env.PORT ?? 3000;
const ips = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

console.log("\n  🦶  Jardón Ortopedia · Gestión clínica y taller");
console.log(`  ➜  En este equipo:   http://localhost:${port}`);
for (const ip of ips) console.log(`  ➜  Desde la Wi-Fi:   http://${ip}:${port}`);
console.log("");
