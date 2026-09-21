# Habítalo Orienta

Página de venta y herramienta en un solo archivo: explica qué obtiene la
persona, le deja ver gratis su resultado y cobra $50 por el diagnóstico
completo en PDF. El estado de cuenta se lee **dentro del navegador**: no
se envía a ningún servidor.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página completa (landing + herramienta) |
| `pdfgen.js` | Arma el PDF del diagnóstico. Va junto a `index.html` |
| `muestra-1.jpg` … `muestra-4.jpg` | Miniaturas del diagnóstico de muestra |
| `diagnostico-muestra.pdf` | Diagnóstico completo del caso inventado |

## Ligas para publicidad

Cada anuncio puede abrir con su propia frase arriba:

- `…/orienta/?v=casa` → ¿Estás pagando una casa… o principalmente intereses? (la de siempre)
- `…/orienta/?v=fecha` → ¿Sabes realmente cuándo será tu última mensualidad del Infonavit?
- `…/orienta/?v=antes` → ¿Y si pudieras dejar de pagar tu mensualidad antes de lo que imaginas?

También funciona con `utm_content=casa|fecha|antes`.

## Lo que se configura a mano (en `index.html`, al inicio del script)

- `API_PAGOS` — dirección del verificador de pagos. Vacío = no se verifica
  el pago. Ver `COMO-ACTIVAR-EL-COBRO.txt`. **No lances anuncios con esto vacío.**
- `LIGA_PAGO` — liga fija de Mercado Pago (plan B).
- `VIDEO_TUTORIAL` — liga de YouTube del tutorial. Vacío = no aparece.

## Las cifras del ejemplo

Todo lo que se ve arriba (los $19 de cada $100, la gráfica, la fecha,
el ahorro con $1,000) lo calcula el mismo motor sobre un crédito
inventado (`datosEjemplo()`). Si cambia el motor, cambian solos.

---

No es una página del Infonavit. Responsable del tratamiento de datos:
Alejandro Rodríguez Aznar, quien opera como Habítalo México, Cancún,
Quintana Roo · contacto@habitalo.com.mx
