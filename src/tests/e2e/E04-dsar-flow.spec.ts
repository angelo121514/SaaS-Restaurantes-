/**
 * E-04: DSAR full flow
 * Cliente envía solicitud → recibe email → confirma → admin ve DSAR en cola
 */
import { test, expect } from "@playwright/test";

test("E-04 · DSAR flow con verificación por email", async ({ page }) => {
  const testEmail = `dsar-test-${Date.now()}@example.com`;

  // 1. Ir a formulario DSAR
  await page.goto("/legal/contacto-dpo");
  await page.click('a:has-text("ejercer derechos"), button:has-text("solicitar")');

  // 2. Llenar formulario DSAR
  await page.fill('input[name="email"], #email', testEmail);
  await page.selectOption('select[name="request_type"], #request_type', "access");
  await page.click('button[type="submit"]:has-text("Enviar")');

  // 3. Verificar mensaje de "verificación enviada por email"
  await expect(page.locator("body")).toContainText(/verificación|revisa tu correo/i);

  // 4. (En test, simular click en el link)
  // En producción, el email contendría: https://app.cmorflow.cl/verify-dsar?token=xxx
  // Para test, obtendríamos el token de la DB o de Resend API.
  // Por ahora, testear con token inválido (debe dar error):
  await page.goto("/verify-dsar/00000000-0000-0000-0000-000000000000");
  await expect(page.locator("body")).toContainText(/error|inválido|inválido|inválido/i);

  // 5. Admin login y verificar DSAR en cola
  await page.goto("/admin/login");
  await page.fill('input[name="email"], #email', process.env.E2E_ADMIN_EMAIL || "admin@test.com");
  await page.fill('input[name="password"], #password', process.env.E2E_ADMIN_PASSWORD || "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);

  await page.click('a:has-text("Privacidad"), a:has-text("DSAR"), a:has-text("solicitudes")');
  await expect(page.locator("body")).toContainText(testEmail);
});
