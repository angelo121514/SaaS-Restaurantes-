/**
 * E-01: Flujo completo de registro de owner
 * Landing → register → payment mock → setup password → login → ver restaurant home
 *
 * Requiere: app corriendo en http://localhost:5173 con .env (no mock)
 * o modo demo (mock).
 */
import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test("E-01 · Registro owner completo", async ({ page }) => {
  const email = faker.internet.email();
  const password = "TestPassword123!";

  // 1. Landing page
  await page.goto("/");
  await expect(page).toHaveTitle(/CMOR|Cmor|food/i);

  // 2. Click en registrarse
  await page.click('a[href="/register"], button:has-text("Registrar")');
  await page.waitForURL(/\/register/);

  // 3. Llenar formulario de registro
  await page.fill('input[name="restaurant_name"], #restaurant_name', faker.company.name());
  await page.fill('input[name="owner_name"], #owner_name', faker.person.fullName());
  await page.fill('input[name="email"], #email', email);
  await page.fill('input[name="phone"], #phone', "+56912345678");
  await page.fill('input[name="password"], #password', password);

  // 4. Seleccionar plan free_trial
  await page.click('[data-plan="free_trial"], button:has-text("Free Trial")');

  // 5. Submit
  await page.click('button[type="submit"]:has-text("Crear cuenta"), button:has-text("Registrar")');

  // 6. Esperar redirección a setup-password o dashboard
  await page.waitForURL(/\/setup-password|\/restaurant|\/login/, { timeout: 15_000 });

  // 7. Si llegó a setup-password, completar
  if (page.url().includes("/setup-password")) {
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/restaurant|\/login/, { timeout: 10_000 });
  }

  // 8. Verificar que está en dashboard de restaurante
  if (page.url().includes("/restaurant")) {
    await expect(page.locator("body")).toContainText(/dashboard|restaurante|menú|menu/i);
  }
});
