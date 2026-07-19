import type { AppData, MealSlot, Recipe, WeekPlan } from '../data/types'
import { CATEGORY_LABELS, MEAL_TYPE_LABELS } from '../data/types'
import { DAY_NAMES, addDays, parseISODate, weekLabel } from './dates'
import { fmtEuro, fmtNum } from './format'
import { ingredientMap, recipeMacrosPerServing } from './nutrition'
import {
  MAIN_MEALS,
  dayIsPlanned,
  dayMacrosForPerson,
  daySlots,
  recipeMap,
} from './planner'
import { aggregateWeek, groupByCategory, shoppingTotals } from './shopping'

const MEAL_ICONS: Record<string, string> = {
  desayuno: '🥐',
  almuerzo: '🍲',
  cena: '🌙',
  snack: '🍎',
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Genera un HTML autocontenido (CSS y JS inline, sin dependencias externas)
 * con el plan semanal, la lista de la compra y las recetas de la semana.
 */
export function buildWeekExportHtml(data: AppData, week: WeekPlan): string {
  const recipesById = recipeMap(data.recipes)
  const ingredientsById = ingredientMap(data.ingredients)
  const personCount = data.persons.length

  const slotLine = (icon: string, label: string, slot: MealSlot): string => {
    const recipe = recipesById.get(slot.recipeId)
    const name = recipe?.name ?? '(receta borrada)'
    const rac = fmtNum(slot.servings, slot.servings % 1 === 0 ? 0 : 1)
    return `<li><span class="icon">${icon}</span><span class="meal">${esc(label)}</span><span class="dish">${esc(name)}</span><span class="rac">${rac} rac.</span></li>`
  }

  const dayCards = week.days
    .map((day, i) => {
      const date = addDays(parseISODate(week.weekStart), i)
      const lines: string[] = []
      for (const meal of MAIN_MEALS) {
        const slot = day[meal]
        if (slot !== undefined) lines.push(slotLine(MEAL_ICONS[meal], MEAL_TYPE_LABELS[meal], slot))
      }
      for (const snack of day.snacks ?? []) {
        lines.push(slotLine(MEAL_ICONS.snack, 'Snack', snack))
      }
      const persons = !dayIsPlanned(day)
        ? ''
        : `<div class="totals">${data.persons
            .map((p) => {
              const m = dayMacrosForPerson(day, p.id, personCount, recipesById, ingredientsById)
              return `<span class="chip"><strong>${esc(p.name)}</strong> ${fmtNum(m.kcal)} kcal · P ${fmtNum(m.protein)} · H ${fmtNum(m.carbs)} · G ${fmtNum(m.fat)}</span>`
            })
            .join('')}</div>`
      return `<article class="card day">
  <h3>${DAY_NAMES[i]} ${date.getDate()}</h3>
  ${day.note !== undefined ? `<p class="note">📝 ${esc(day.note)}</p>` : ''}
  ${lines.length > 0 ? `<ul class="meals">${lines.join('')}</ul>` : '<p class="empty">Sin comidas planificadas.</p>'}
  ${persons}
</article>`
    })
    .join('\n')

  const shoppingLines = aggregateWeek(week, recipesById, ingredientsById)
  const haveAtHome = new Set(week.shopping.haveAtHome)
  const groups = groupByCategory(shoppingLines.filter((l) => !haveAtHome.has(l.ingredientId)))
  const totals = shoppingTotals(shoppingLines, week)

  const shoppingHtml = groups
    .map(
      (g) => `<section class="card">
  <h3>${CATEGORY_LABELS[g.category]}</h3>
  <ul class="shop">${g.lines
    .map(
      (l) => `<li><label><input type="checkbox" data-key="${esc(l.ingredientId)}"><span class="name">${esc(l.name)}</span><span class="qty">${fmtNum(l.qty, l.qty % 1 === 0 ? 0 : 1)} ${l.unit}</span><span class="price">${l.cost === null ? '—' : fmtEuro(l.cost)}</span></label></li>`,
    )
    .join('')}</ul>
</section>`,
    )
    .join('\n')

  const extrasHtml =
    week.shopping.extras.length === 0
      ? ''
      : `<section class="card">
  <h3>Extras</h3>
  <ul class="shop">${week.shopping.extras
    .map(
      (x) => `<li><label><input type="checkbox" data-key="extra-${esc(x.id)}"><span class="name">${esc(x.name)}${x.qty !== undefined ? ` <small>(${esc(x.qty)})</small>` : ''}</span><span class="price">${x.price === undefined ? '—' : fmtEuro(x.price)}</span></label></li>`,
    )
    .join('')}</ul>
</section>`

  const usedRecipeIds = [
    ...new Set(week.days.flatMap((d) => daySlots(d).map((s) => s.recipeId))),
  ]
  const usedRecipes = usedRecipeIds
    .map((id) => recipesById.get(id))
    .filter((r): r is Recipe => r !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const recipesHtml = usedRecipes
    .map((r) => {
      const per = recipeMacrosPerServing(r, ingredientsById)
      const items = r.items
        .map((it) => {
          const ing = ingredientsById.get(it.ingredientId)
          if (ing === undefined) return ''
          return `<li>${esc(ing.name)} — ${fmtNum(it.qty, it.qty % 1 === 0 ? 0 : 1)} ${it.unit}</li>`
        })
        .join('')
      const steps =
        r.steps !== undefined && r.steps.length > 0
          ? `<ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
          : ''
      return `<article class="card recipe">
  <h3>${MEAL_ICONS[r.mealType]} ${esc(r.name)}</h3>
  <p class="meta">${MEAL_TYPE_LABELS[r.mealType]} · ${fmtNum(r.servings, r.servings % 1 === 0 ? 0 : 1)} raciones · ${fmtNum(per.kcal)} kcal/rac. (P ${fmtNum(per.protein)} · H ${fmtNum(per.carbs)} · G ${fmtNum(per.fat)})</p>
  <ul class="ings">${items}</ul>
  ${steps}
</article>`
    })
    .join('\n')

  const storageKey = `comidas-export-${week.weekStart}`

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(weekLabel(week.weekStart))}</title>
<style>
:root{--terra:#cd6f3d;--terra-dark:#92411a;--cream:#fbf7f0;--ink:#44403c;--muted:#a8a29e;--line:#f5ead8}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--cream);color:var(--ink);padding-bottom:3rem}
header{position:sticky;top:0;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:.7rem 1rem;z-index:5}
header h1{font-family:Georgia,'Times New Roman',serif;font-size:1.05rem;color:var(--terra-dark)}
header p{font-size:.75rem;color:var(--muted)}
nav{display:flex;gap:.4rem;margin-top:.5rem}
nav button{flex:1;border:0;border-radius:999px;padding:.45rem .6rem;font-size:.85rem;font-weight:600;background:#f0e4d2;color:var(--ink)}
nav button.active{background:var(--terra);color:#fff}
main{max-width:640px;margin:0 auto;padding:1rem}
section.tab{display:none}
section.tab.active{display:block}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:.9rem 1rem;margin-bottom:.8rem;box-shadow:0 2px 8px rgb(92 42 22 / .06)}
.card h3{font-family:Georgia,serif;font-size:1rem;color:var(--terra-dark);margin-bottom:.4rem}
.note{font-size:.8rem;font-style:italic;color:var(--muted);margin-bottom:.3rem}
.empty{font-size:.8rem;color:var(--muted)}
ul{list-style:none}
.meals li{display:flex;align-items:baseline;gap:.45rem;padding:.28rem 0;font-size:.9rem;border-bottom:1px dashed var(--line)}
.meals li:last-child{border-bottom:0}
.meals .meal{color:var(--muted);font-size:.72rem;width:4.3rem;flex:none}
.meals .dish{flex:1;font-weight:600}
.meals .rac{font-size:.72rem;color:var(--muted);flex:none}
.totals{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.55rem}
.chip{font-size:.7rem;background:var(--cream);border:1px solid var(--line);border-radius:999px;padding:.2rem .55rem}
.shop label{display:flex;align-items:center;gap:.6rem;padding:.42rem 0;font-size:.92rem;border-bottom:1px dashed var(--line)}
.shop li:last-child label{border-bottom:0}
.shop input{width:1.15rem;height:1.15rem;accent-color:var(--terra);flex:none}
.shop .name{flex:1}
.shop input:checked ~ .name{text-decoration:line-through;color:var(--muted)}
.shop .qty{font-size:.75rem;color:var(--muted);flex:none}
.shop .price{font-size:.8rem;color:var(--ink);flex:none;min-width:3.4rem;text-align:right}
.total-card{background:linear-gradient(135deg,var(--terra),#b0521f);color:#fff;border:0}
.total-card h3{color:#fff}
.total-card .big{font-size:1.7rem;font-weight:800}
.total-card p{font-size:.72rem;opacity:.85;margin-top:.25rem}
.recipe .meta{font-size:.75rem;color:var(--muted);margin-bottom:.45rem}
.ings li{font-size:.86rem;padding:.16rem 0}
.steps{margin-top:.5rem;padding-left:1.2rem;list-style:decimal}
.steps li{font-size:.86rem;padding:.16rem 0}
@media print{
  header nav{display:none}
  body{background:#fff;padding-bottom:0}
  section.tab{display:block !important;page-break-before:always}
  section.tab:first-of-type{page-break-before:auto}
  .card{box-shadow:none;break-inside:avoid}
  .tab>h2{font-family:Georgia,serif;margin:.6rem 0}
}
@media screen{.tab>h2{display:none}}
</style>
</head>
<body>
<header>
  <h1>🍽️ ${esc(weekLabel(week.weekStart))}</h1>
  <p>Plan de comidas de ${data.persons.map((p) => esc(p.name)).join(' y ')}</p>
  <nav>
    <button type="button" class="active" data-tab="plan">📅 Plan</button>
    <button type="button" data-tab="compra">🛒 Compra</button>
    <button type="button" data-tab="recetas">🍳 Recetas</button>
  </nav>
</header>
<main>
  <section class="tab active" id="tab-plan"><h2>Plan semanal</h2>
${dayCards}
  </section>
  <section class="tab" id="tab-compra"><h2>Lista de la compra</h2>
  <section class="card total-card">
    <h3>Total estimado</h3>
    <div class="big">${fmtEuro(totals.total)}</div>
    ${totals.linesWithoutPrice > 0 ? `<p>⚠️ ${totals.linesWithoutPrice === 1 ? '1 producto sin precio no cuenta' : `${totals.linesWithoutPrice} productos sin precio no cuentan`} en el total.</p>` : ''}
  </section>
${shoppingHtml}
${extrasHtml}
  </section>
  <section class="tab" id="tab-recetas"><h2>Recetas de la semana</h2>
${recipesHtml.length > 0 ? recipesHtml : '<p class="empty">No hay recetas planificadas.</p>'}
  </section>
</main>
<script>
(function(){
  var KEY=${JSON.stringify(storageKey)};
  var tabs=document.querySelectorAll('nav button');
  tabs.forEach(function(b){b.addEventListener('click',function(){
    tabs.forEach(function(x){x.classList.remove('active')});
    document.querySelectorAll('section.tab').forEach(function(s){s.classList.remove('active')});
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
    window.scrollTo(0,0);
  })});
  var boxes=document.querySelectorAll('.shop input[type=checkbox]');
  var saved=[];
  try{saved=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){}
  boxes.forEach(function(b){
    if(saved.indexOf(b.dataset.key)!==-1)b.checked=true;
    b.addEventListener('change',function(){
      var now=[];
      boxes.forEach(function(x){if(x.checked)now.push(x.dataset.key)});
      try{localStorage.setItem(KEY,JSON.stringify(now))}catch(e){}
    });
  });
})();
</script>
</body>
</html>`
}
