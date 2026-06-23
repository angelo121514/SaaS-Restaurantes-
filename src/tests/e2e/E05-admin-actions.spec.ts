/**
 * E-05: Admin login → dashboard → approve pending → toggle restaurant
 */
import { test, expect } from "@playwright/test";

test("E-05 · Admin approve + toggle restaurant", async ({ page }) => {
  // 1. Login admin
  await page.goto("/admin/login");
  await page.fill('input[name="email"], #email', process.env.E2E_ADMIN_EMAIL || "admin@test.com");
  await page.fill('input[name="password"], #password', process.env.E2E_ADMIN_PASSWORD || "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);

  // 2. Ver dashboard
  await expect(page.locator("body")).toContainText(/dashboard|pendientes|restaurantes/i);

  // 3. Ir a solicitudes pendientes
  await page.click('a:has-text("Pendientes"), a:has-text("solicitudes")');
  await page.waitForURL(/\/admin\/pending/);

  // 4. Aprobar primera solicitud (si existe)
  const approveBtn = page.locator('button:has-text("Aprobar")').first();
  if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await approveBtn.click();
    await expect(page.locator("body")).toContainText(/aprobado|success|éxito/i);
  }

  // 5. Ir a restaurantes
  await page.click('a:has-text("Restaurantes"), a:has-text("All Restaurants")');
  await page.waitForURL(/\/admin\/restaurants/);

  // 6. Toggle status del primer restaurante
  const toggleBtn = page.locator('button:has-text("Bloquear"), button:has-text("Activar")').first();
  if (await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await toggleBtn.click();
    // No debe dar error de permisos (P0-3 REVOKE ejecutado)
    await expect(page.locator("body")).not.toContainText(/error|denied|no autorizado/i);
  }
});
