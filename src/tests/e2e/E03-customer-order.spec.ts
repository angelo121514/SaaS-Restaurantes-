/**
 * E-03: Cliente hace pedido completo
 * menú → carrito → checkout → owner recibe notificación
 */
import { test, expect } from "@playwright/test";

test("E-03 · Cliente hace pedido E2E", async ({ page, context }) => {
  const slug = process.env.E2E_RESTAURANT_SLUG || "test-restaurant";

  // 1. Cliente abre menú
  await page.goto(`/menu/${slug}`);
  await expect(page.locator("body")).toContainText(/menú|menu|carta/i);

  // 2. Agregar item al carrito
  const firstItem = page.locator('[data-testid="menu-item"], .menu-item').first();
  if (await firstItem.isVisible()) {
    await firstItem.locator('button:has-text("Agregar"), button:has-text("+")').click();
  }

  // 3. Ir al carrito
  await page.click('button:has-text("Carrito"), [data-testid="cart-button"]');
  await expect(page.locator("body")).toContainText(/total|subtotal/i);

  // 4. Checkout
  await page.fill('input[name="customer_name"], #customer_name', "Cliente Test");
  await page.fill('input[name="customer_phone"], #customer_phone', "+56912345678");

  await page.click('button:has-text("Confirmar pedido"), button:has-text("Enviar pedido")');

  // 5. Verificar confirmación
  await expect(page.locator("body")).toContainText(/pedido (realizado|confirmado|enviado)/i);

  // 6. En otra pestaña, owner debe ver el nuevo pedido
  const ownerPage = await context.newPage();
  await ownerPage.goto("/login");
  await ownerPage.fill('input[name="email"], #email', process.env.E2E_OWNER_EMAIL || "owner@test.com");
  await ownerPage.fill('input[name="password"], #password', process.env.E2E_OWNER_PASSWORD || "password123");
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(/\/restaurant/);

  await ownerPage.click('a:has-text("Pedidos"), a:has-text("Orders")');
  await expect(ownerPage.locator("body")).toContainText("Cliente Test");
});
