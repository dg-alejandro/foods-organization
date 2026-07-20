# Prompt — Ampliaciones del planificador de comidas (tandas 1–6)

## Contexto

App existente y funcionando en este repo (`dg-alejandro/foods-organization`, rama `main`): planificador semanal de comidas para 2 personas con React + Vite + TypeScript + Tailwind v4, persistencia en `localStorage`, 100 % offline, UI en español (formato es-ES: coma decimal, € con dos decimales).

Arquitectura que debes respetar:

- **Capa de datos aislada de la UI**: tipos en `src/data/types.ts`, persistencia en `src/data/storage.ts`, store React en `src/data/store.tsx`. La lógica de negocio vive en `src/lib/*` como funciones puras (nutrition, planner, shopping, dates, exportHtml, demo); las páginas en `src/pages/*` solo componen UI.
- **Paleta**: definida como variables `--color-orange-*` en `src/index.css` (marfil/salvia/verde bosque); las clases de componentes usan la escala `orange-*` de Tailwind. Tipografías Fraunces (títulos) y Nunito Sans (texto) vía @fontsource, empaquetadas offline.
- **Datos existentes**: los usuarios ya tienen datos reales en `localStorage` (clave `comidas.app.v1`). Todo cambio de modelo debe ser **aditivo y opcional** (campos `?`), sin romper datos guardados ni la importación de copias antiguas. No subas la versión del esquema salvo necesidad real.
- Sin peticiones de red en tiempo de ejecución, sin `any` gratuitos, componentes pequeños.

## Proceso de trabajo (obligatorio)

1. Trabaja **una tanda cada vez, en el orden dado**. Antes de empezar cada tanda, resume brevemente tu enfoque y las decisiones de producto que tomes.
2. Al terminar cada tanda: `npm run build` limpio, **verificación real en el navegador** (flujo completo del usuario, no solo que compile; comprueba también que recarga y persistencia funcionan), commit descriptivo en español y push a `main`.
3. Para y deja probar al usuario antes de pasar a la siguiente tanda.
4. Si una decisión es ambigua, elige la opción más simple y decláralo en el resumen.
5. Actualiza el HTML exportado (`src/lib/exportHtml.ts`) y los datos de demo (`scripts/generar-demo.ts` → `public/demo-semana.json`) solo cuando la tanda afecte a lo que muestran.

---

## Tanda 1 — PWA instalable

Convertir la app en PWA para instalarla con icono en los móviles y usarla offline sin exportar HTML.

- Usa `vite-plugin-pwa` con `registerType: 'autoUpdate'` y precaché de todos los assets del build.
- Manifest en español: nombre «Comidas de la semana», `theme_color` y `background_color` de la paleta botánica, orientación portrait.
- Genera los iconos (192, 512 y maskable) desde un SVG propio acorde a la paleta; guárdalos en `public/`.
- Añade en Ajustes una tarjeta «Instalar en el móvil» con instrucciones breves (Android: menú → Añadir a pantalla de inicio; iOS: compartir → Añadir a pantalla de inicio) y, si el navegador lo permite, botón que dispare el evento `beforeinstallprompt`.
- Criterios: instalable (comprobación de manifest + service worker), funciona con el servidor parado tras la primera carga, y export/import JSON siguen funcionando igual. El export HTML se mantiene (sirve para compartir/imprimir).

## Tanda 2 — Drag & drop y copiar/pegar en la cuadrícula

Mover y duplicar comidas entre huecos sin pasar por el editor.

- Arrastrar un plato de un hueco a otro = **mover** (incluido entre filas distintas: un almuerzo puede soltarse en una cena). Con `Ctrl` pulsado al soltar = **copiar**. Usa la API nativa de drag & drop; sin librerías.
- Soporte táctil/alternativo: menú contextual por hueco (botón ⋯ o clic derecho) con Cortar / Copiar / Pegar / Quitar; el portapapeles interno vive en estado de React (no persiste).
- Al soltar sobre un hueco ocupado, el destino se sobrescribe (confirmación no necesaria; es reversible re-arrastrando). Los snacks aceptan varios: soltar sobre la celda de snacks añade.
- Criterios: mover, copiar y pegar funcionan entre días y tipos de comida, el reparto de raciones por persona viaja con el plato, y todo persiste tras recargar.

## Tanda 3 — Autorrelleno de semana

Botón «✨ Rellenar semana» que propone recetas para los huecos vacíos.

- Lógica pura en `src/lib/suggest.ts`, testeable sin UI.
- Algoritmo: para cada hueco vacío, elige entre las recetas del tipo correspondiente puntuando: (a) acercar el total diario de cada persona a sus objetivos (kcal y macros), (b) penalizar repetir receta a menos de 2 días de distancia, (c) penalizar recetas ya usadas esta semana (se permite repetir si el banco es pequeño), (d) algo de azar para que dos pulsaciones no den siempre lo mismo.
- Solo rellena huecos vacíos: nunca toca lo ya asignado. Raciones por defecto: las últimas usadas por la pareja (o 1/1).
- UI: botón en la cabecera de Semana; tras rellenar, aviso con «Deshacer» (restaura el estado anterior) y «Volver a proponer» (re-ejecuta solo sobre los huecos que él mismo rellenó).
- Criterios: con el banco de demo, una semana vacía queda completa, sin la misma receta dos días seguidos, y las medias diarias quedan dentro de ±20 % de los objetivos cuando el banco lo permite.

## Tanda 4 — Avisos de variedad

Sugerencias pasivas sobre la semana activa.

- Lógica pura en `src/lib/variety.ts` que analiza la semana activa y las 3 anteriores. Reglas iniciales: (a) receta repetida en ≥3 semanas seguidas, (b) ninguna receta con pescado en toda la semana (detección por categoría `pescaderia` de sus ingredientes), (c) misma receta dos días seguidos, (d) categoría de ingrediente dominante (>50 % de los almuerzos+cenas con el mismo ingrediente principal).
- UI: tarjeta discreta bajo el resumen semanal («💡 Ideas: lleváis 3 semanas sin pescado…»), descartable por semana (persistir los avisos descartados en el `WeekPlan`).
- Criterios: los avisos aparecen con datos que los provoquen, se descartan y no vuelven al recargar, y no aparece nada cuando la semana está variada.

## Tanda 5 — Plantillas de semana

Guardar una semana como punto de partida reutilizable.

- Nuevo campo opcional en `AppData`: `templates?: WeekTemplate[]` con `{ id, name, days }` (days sin notas y sin estado de compra).
- En Semana: acción «Guardar como plantilla…» (pide nombre) junto a Duplicar. Al crear una semana nueva, ofrecer «Empezar desde plantilla» con selector.
- Gestión (renombrar, borrar) en Ajustes, en una tarjeta «Plantillas».
- Criterios: guardar, aplicar sobre semana nueva, renombrar y borrar funcionan y persisten; una plantilla aplicada respeta el reparto de raciones guardado.

## Tanda 6 — Estadísticas históricas

Nueva pestaña «Historia» en la navegación principal.

- Lógica pura en `src/lib/stats.ts` sobre `data.weeks` (ordenadas por fecha).
- Contenido: (a) gráfica de gasto semanal estimado (total a comprar de cada semana), (b) gráfica de kcal medias diarias por persona frente a su objetivo, (c) top de recetas más planificadas con contador, (d) gasto acumulado por categoría de ingrediente.
- Gráficas en **SVG propio** (barras y líneas sencillas), sin librerías; colores y tipografías de la paleta actual; tooltips nativos (`<title>`).
- Estado vacío amable si hay menos de 2 semanas con datos.
- Criterios: con 3+ semanas de datos (usa la demo duplicándola con variaciones para probar), las cifras de las gráficas cuadran con lo que muestran las pestañas Semana y Compra de cada semana.

---

## Al terminar las 6 tandas

Repaso general: estados vacíos, textos, que la demo siga representando bien la app (regenerarla si procede) y un vistazo al rendimiento con muchos ingredientes/semanas. Propón (sin implementar) la siguiente hornada de mejoras.
