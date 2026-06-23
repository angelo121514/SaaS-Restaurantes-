/**
 * E-02: Owner crea categoría + menú + imagen + activa
 * Cliente ve menú por slug
 */
import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test("E-02 · Owner crea menú y cliente lo ve", async ({ page, context }) => {
  // Asume que hay un owner logueado (sembrado o login previo)
  // 1. Login como owner
  await page.goto("/login");
  await page.fill('input[name="email"], #email', process.env.E2E_OWNER_EMAIL || "owner@test.com");
  await page.fill('input[name="password"], #password', process.env.E2E_OWNER_PASSWORD || "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/restaurant/);

  // 2. Ir a menú
  await page.click('a:has-text("Menú"), a:has-text("Menu")');
  await page.waitForURL(/\/restaurant\/menu/);

  // 3. Crear categoría
  await page.click('button:has-text("Nueva categoría"), button:has-text("Crear categoría")');
  await page.fill('input[placeholder*="categoría"], #category_name', faker.commerce.department());
  await page.click('button:has-text("Guardar")');

  // 4. Crear item de menú
  await page.click('button:has-text("Nuevo plato"), button:has-text("Agregar item")');
  await page.fill('input[name="name"], #name', faker.commerce.productName());
  await page.fill('textarea[name="description"], #description', faker.commerce.productDescription());
  await page.fill('input[name="base_price"], #base_price', "9990");
  await page.click('button:has-text("Guardar"), button[type="submit"]');

  // 5. Activar item
  await page.click('button:has-text("Activar"), [data-action="toggle-available"]');

  // 6. Obtener slug del restaurante
  const slug = process.env.E2E_RESTAURANT_SLUG || "test-restaurant";

  // 7. Abrir menú público en nueva pestaña (como cliente)
  const customerPage = await context.newPage();
  await customerPage.goto(`/menu/${slug}`);

  // 8. Verificar que el item aparece en el menú público
  await expect(customerPage.locator("body")).toContainText(faker.commerce.productName());
});
