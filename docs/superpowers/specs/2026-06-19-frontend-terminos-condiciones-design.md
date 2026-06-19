# Publicación de Términos y Condiciones en el frontend

> **Spec de diseño.** Generado por brainstorming el 2026-06-19. Describe cómo
> publicar el documento legal aprobado `docs/legal/terminos_y_condiciones.md`
> como una página web pública en el frontend de Cmor Flow.

## Contexto

El plan de privacidad Ley 19.628 / Ley 21.719 (Capa 4, Gobernanza) generó los
documentos legales formales. El abogado **aprobó** los documentos, por lo que
dejan de ser borrador y se publican al público.

El frontend ya tiene 3 páginas legales públicas (`/legal/privacidad`,
`/legal/privacidad-clientes`, `/legal/contacto-dpo`), pero muestran
**resúmenes hardcodeados** dentro de componentes JSX, no el contenido real de
los `.md`. Falta publicar los **Términos y Condiciones** (no existe ruta para
él) y, por consistencia, dejar el documento legal completo accesible.

## Objetivo

Crear una página pública `/legal/terminos` que renderice el contenido aprobado
de `docs/legal/terminos_y_condiciones.md` con formato profesional (headings,
tablas, listas), y añadir enlaces de navegación desde el registro y el footer
público. Single source of truth: el `.md` del repo.

## Decisiones de diseño (aprobadas en brainstorming)

1. **Alcance:** publicar únicamente Términos y Condiciones. Los DPA y los
   documentos internos de gobernanza (RAT, transferencias, checklist) no se
   publican al público.
2. **Presentación:** página web dedicada `/legal/terminos` (no descarga de
   archivo, no PDF).
3. **Origen del contenido:** importar el `.md` con `?raw` de Vite (build time).
   No se hardcodea texto en el componente; no se sirve desde `/public`.
4. **Enlaces de navegación:** enlace en la página de registro (abre en pestaña
   nueva) y enlace en el footer de la LandingPage (navegación interna).
5. **Disclaimer de borrador:** se **elimina** el aviso `> DOCUMENTO BORRADOR…`
   del archivo `docs/legal/terminos_y_condiciones.md` (único archivo al que se
   le quita, porque es el único que se publica en esta tarea). Los demás `.md`
   conservan su disclaimer hasta que se publiquen.
6. **Renderizado:** Enfoque A — librería `marked` + `DOMPurify` + clase `prose`
   de `@tailwindcss/typography`.

## Arquitectura

```
docs/legal/terminos_y_condiciones.md        ← fuente única de verdad
        │  import "?raw" (build time, Vite)
        ▼
src/pages/public/Terms.tsx                  ← nueva página
        │  marked.parse(gfm) → string HTML
        │  DOMPurify.sanitize(html) → string HTML seguro
        ▼
<div className="prose prose-sm max-w-none"
     dangerouslySetInnerHTML={{ __html: safeHtml }} />
        │
        ▼
Navegador: /legal/terminos
```

- **Single source of truth:** el `.md`. Si el abogado edita el documento, el
  frontend se actualiza en el siguiente build. No hay duplicación.
- **Parse en runtime del navegador:** `marked.parse()` es síncrono y rápido
  (~5 ms para un documento de ~100 líneas). No impacta el first paint porque
  la ruta es lazy-loaded.
- **Sanitización obligatoria:** el HTML generado por `marked` se pasa por
  `DOMPurify.sanitize()` antes de inyectarlo con `dangerouslySetInnerHTML`,
  para prevenir XSS aunque la fuente sea un `.md` controlado.

## Componentes

### `src/pages/public/Terms.tsx` (nuevo)

Página pública que sigue el mismo patrón visual que `Privacy.tsx` y
`PrivacyClients.tsx`:

- Barra de navegación superior idéntica: logo `CMOR FLOW` (Link a `/`) +
  "Volver al inicio" (Link a `/`).
- Encabezado: icono `FileText` de `lucide-react` + `<h1>Términos y Condiciones</h1>`
  + `<Badge>Versión {CURRENT_POLICY_VERSION}</Badge>`.
- Cuerpo: `<Card className="p-6 mt-6">` que contiene un `<div className="prose prose-sm max-w-none">`
  con el HTML sanitizado.
- Pie de la card: botón ghost "Contactar al DPO" (Link a `/legal/contacto-dpo`),
  igual que en `Privacy.tsx`.

**Lógica de renderizado:**

```tsx
import { marked } from "marked";
import DOMPurify from "dompurify";
import { FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card, Badge } from "../../components/ui";
import { CURRENT_POLICY_VERSION } from "../../config/supabase";
import tycRaw from "../../../docs/legal/terminos_y_condiciones.md?raw";

// Configurar marked una vez (GFM para tablas)
marked.use({ gfm: true, breaks: false });

// Parse + sanitize a nivel de módulo (se ejecuta una vez por carga del chunk)
const rawHtml = marked.parse(tycRaw) as string;
const safeHtml = DOMPurify.sanitize(rawHtml);

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* nav idéntica a Privacy.tsx */}
      <div className="container-custom py-12 max-w-3xl">
        {/* header con FileText + título + Badge versión */}
        <Card className="p-6 mt-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </Card>
        {/* botón Contactar al DPO */}
      </div>
    </div>
  );
};
```

### `src/App.tsx` (modificación)

Añadir la ruta pública y el lazy import:

```tsx
const PublicTerms = lazy(() => import("./pages/public/Terms"));
// ...
<Route path="/legal/terminos" element={<PublicTerms />} />
```

Se coloca junto a las demás rutas `/legal/*` existentes (líneas 50-52).

### `src/pages/public/RegisterPage.tsx` (modificación)

Reemplazar el bloque informativo `{/* Terms */}` (líneas 934-937) por un
párrafo con enlaces reales que abren en pestaña nueva:

```tsx
{/* Terms */}
<div className="bg-bg border border-border rounded-xl p-4 text-xs text-text-secondary leading-relaxed transition-colors">
  Al enviar este formulario, aceptas nuestros{" "}
  <a
    href="/legal/terminos"
    target="_blank"
    rel="noopener noreferrer"
    className="text-red-500 font-semibold hover:text-red-600 hover:underline"
  >
    Términos y Condiciones
  </a>{" "}
  y nuestra{" "}
  <Link
    to="/legal/privacidad"
    className="text-red-500 font-semibold hover:text-red-600 hover:underline"
  >
    Política de Privacidad
  </Link>
  . Nuestro equipo se pondrá en contacto contigo a la brevedad.
</div>
```

Se usa `<a target="_blank">` para Términos (para no perder el formulario de
registro mientras se lee) y `<Link>` interno para Privacidad (coherente con el
resto de la app).

### `src/pages/public/LandingPage.tsx` (modificación)

Añadir un footer legal al final de la landing con enlaces internos `<Link>`:

```tsx
<footer className="border-t border-border bg-bg-subtle">
  <div className="container-custom py-8 text-center text-sm text-text-secondary">
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <Link to="/legal/privacidad" className="hover:text-accent">Política de Privacidad</Link>
      <span>·</span>
      <Link to="/legal/privacidad-clientes" className="hover:text-accent">Privacidad de Clientes</Link>
      <span>·</span>
      <Link to="/legal/terminos" className="hover:text-accent">Términos y Condiciones</Link>
      <span>·</span>
      <Link to="/legal/contacto-dpo" className="hover:text-accent">Contacto DPO</Link>
    </div>
    <p className="mt-3">© {new Date().getFullYear()} Cmor Flow · v{CURRENT_POLICY_VERSION}</p>
  </div>
</footer>
```

La landing es la entrada pública principal y funciona como hub legal. No se
crea un componente footer compartido nuevo (YAGNI).

## Cambios en `docs/legal/terminos_y_condiciones.md`

Eliminar la línea de disclaimer al inicio del archivo:

```
> DOCUMENTO BORRADOR — Requiere revisión de un abogado chileno antes de su publicación oficial.
```

Solo se elimina de este archivo. Los demás `.md` de la Capa 4 conservan su
disclaimer.

## Dependencias

| Paquete | Tipo | Estado | Acción |
|---|---|---|---|
| `marked` | dependency | No instalado | `npm install marked` |
| `dompurify` | dependency | Instalado (transitivo de jspdf@3.0.4) | `npm install dompurify` (promover a directa) |
| `@types/dompurify` | devDependency | No instalado | `npm install -D @types/dompurify` |
| `@tailwindcss/typography` | devDependency | No instalado | `npm install -D @tailwindcss/typography` |

**Configuración Tailwind:** el `tailwind.config.js` del proyecto usa ESM
(`export default`). Registrar el plugin con import ESM:

```js
import typography from "@tailwindcss/typography";

export default {
  // ...config existente (content, darkMode, theme...)
  plugins: [typography],
};
```

Solo se añade la línea de `import` al inicio y se cambia `plugins: []` por
`plugins: [typography]`.

## Tipos TypeScript

Añadir declaración de módulo para imports `*.md?raw`. Crear
`src/types/raw.d.ts`:

```ts
declare module "*.md?raw" {
  const content: string;
  export default content;
}
```

Vite maneja `?raw` nativamente; esta declaración es solo para que TypeScript no
errorée en el import.

## Manejo de errores y edge cases

- **Markdown mal formado:** `marked` es tolerante; en el peor caso renderiza
  texto plano. `DOMPurify` garantiza que no haya HTML peligroso.
- **Documento vacío:** si el `.md` estuviera vacío, la página muestra la card
  vacía con header. Aceptable (no ocurrirá, el archivo está commiteado).
- **Versión del documento:** se muestra `CURRENT_POLICY_VERSION` de
  `src/config/supabase.ts` (`2026-06-01`), coherente con `docs/legal/VERSION.md`.
  Si cambia la versión, hay que actualizar esa constante (ya es así hoy).

## Verificación

1. `npm install` (instala las 4 dependencias nuevas).
2. `npm run lint` — debe pasar sin errores.
3. `npm run build` — debe pasar sin errores TS.
4. `npm run dev` y navegar a `http://localhost:5173/legal/terminos`:
   - El documento se renderiza con headings, tablas (Anexo A) y listas.
   - El badge muestra "Versión 2026-06-01".
   - El botón "Contactar al DPO" lleva a `/legal/contacto-dpo`.
5. Navegar a `/register`: el enlace "Términos y Condiciones" abre `/legal/terminos`
   en pestaña nueva.
6. Navegar a `/` (landing): el footer muestra los 4 enlaces legales.
7. Verificar que `docs/legal/terminos_y_condiciones.md` ya no contiene la línea
   `> DOCUMENTO BORRADOR`.

## Fuera de alcance

- Publicar otros documentos legales (DPA, política B2B completa, etc.). Cada
  uno se publica en su propia tarea cuando se decida.
- Reemplazar los resúmenes hardcodeados de `Privacy.tsx`/`PrivacyClients.tsx`
  por el texto completo del `.md`. (Se evaluó y se pospuso: fuera de scope.)
- Descarga en PDF de los Términos.
- Componente footer compartido reutilizable en todas las páginas.
- Componente para mostrar el disclaimer de "borrador" en el frontend (ya no
  aplica: el abogado aprobó).
