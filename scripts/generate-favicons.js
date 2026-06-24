import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const svgPath = path.resolve(publicDir, "favicon.svg");
const fileUrl = `file://${svgPath}`;

async function generateFavicons() {
  console.log("Iniciando Playwright para renderizar y optimizar el favicon...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const targets = [
    { size: 16, path: path.resolve(publicDir, "favicon-16x16.png") },
    { size: 32, path: path.resolve(publicDir, "favicon-32x32.png") },
    { size: 180, path: path.resolve(publicDir, "apple-touch-icon.png") }
  ];

  for (const target of targets) {
    console.log(`Generando icono de ${target.size}x${target.size}px...`);
    await page.setViewportSize({ width: target.size, height: target.size });
    await page.goto(fileUrl);
    
    // Esperar a que el SVG esté listo
    await page.waitForSelector("svg");
    
    // Capturar pantalla con fondo transparente
    await page.screenshot({
      path: target.path,
      omitBackground: true
    });
  }

  await browser.close();
  console.log("✅ Iconos optimizados generados exitosamente en la carpeta public.");
}

generateFavicons().catch((err) => {
  console.error("❌ Error al generar los iconos:", err);
  process.exit(1);
});
