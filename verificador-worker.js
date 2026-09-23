/* ------------------------------------------------------------------
   Habítalo Orienta — verificador de pagos (Cloudflare Worker)

   Lo único que hace es hablar con Mercado Pago usando tu llave
   secreta, que vive aquí y nunca en la página. Nunca recibe ni guarda
   datos del crédito: solo el folio del diagnóstico y el número de
   operación del pago.

   También lleva una cuenta simple de cuánta gente llega y cuánta llega
   hasta el final. Son contadores y nada más: sin cookies, sin dirección
   IP, sin navegador, sin nada que permita saber quién es cada quien.

   Rutas:
     POST /pagar      {folio, volver}  -> {ok, url}   crea el cobro de $50
     GET  /verificar?id=NUMERO         -> {ok, folio} comprueba que el pago
                                                       existe, es tuyo, está
                                                       aprobado y es de $50
     POST /paso       {paso, v}        -> {ok}        suma uno al contador
     GET  /tablero?clave=...           -> página con los contadores por día

   Variables (Settings -> Variables and Secrets):
     MP_ACCESS_TOKEN  (secreto)  Access Token de producción de Mercado Pago
     ORIGENES         dominios que pueden usarlo, separados por coma:
                      https://tuusuario.github.io,https://habitalo.com.mx
     PRECIO           opcional, por defecto 50
     DIAS             opcional, antigüedad máxima del pago, por defecto 30
     MAX_USOS         opcional, veces que un pago desbloquea, por defecto 5
     CLAVE_TABLERO    (secreto) para poder abrir /tablero
   KV opcional:
     USOS             si lo conectas, cuenta cuántas veces se usó cada pago
                      y guarda los contadores del tablero
   ------------------------------------------------------------------ */

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origen = req.headers.get("Origin") || "";
    const permitidos = String(env.ORIGENES || "")
      .split(",").map(s => s.trim().replace(/\/+$/, "")).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": permitidos.includes(origen) ? origen : (permitidos[0] || "null"),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o), {
      status: s,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });

    /* ----------------------------------------------------------------
       Contadores. Una llave por día, paso y variante del anuncio; el
       valor es un número y nada más. No se guarda IP, ni navegador, ni
       nada del visitante. Si falla, no pasa nada: la página no depende
       de esto.
       ---------------------------------------------------------------- */
    const PASOS = ["visita", "documento", "numeros", "pagar", "pago"];
    const hoyMx = () => {
      // el día se corta a medianoche en Cancún (UTC-5, sin horario de verano)
      const d = new Date(Date.now() - 5 * 3600 * 1000);
      return d.toISOString().slice(0, 10);
    };
    const sumar = async (paso, variante) => {
      if (!env.USOS || PASOS.indexOf(paso) < 0) return;
      const v = ["casa", "fecha", "antes"].indexOf(String(variante)) >= 0 ? String(variante) : "otra";
      const k = "m:" + hoyMx() + ":" + paso + ":" + v;
      try {
        const n = Number(await env.USOS.get(k) || 0);
        await env.USOS.put(k, String(n + 1), { expirationTtl: 60 * 60 * 24 * 400 });
      } catch (e) { /* si el contador falla, se pierde ese dato y ya */ }
    };

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/" || url.pathname === "/salud") {
      return json({ ok: true, servicio: "orienta-pagos", configurado: !!env.MP_ACCESS_TOKEN && permitidos.length > 0 });
    }
    if (permitidos.length && origen && !permitidos.includes(origen)) return json({ ok: false, motivo: "origen" }, 403);

    const token = env.MP_ACCESS_TOKEN;
    if (!token) return json({ ok: false, motivo: "sin_configurar" }, 500);
    const PRECIO = Number(env.PRECIO || 50);
    const mp = (ruta, init = {}) => fetch("https://api.mercadopago.com" + ruta, {
      ...init,
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", ...(init.headers || {}) }
    });

    try {
      /* ---------- contador de pasos ---------- */
      if (url.pathname === "/paso" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        await sumar(String(b.paso || ""), b.v);
        return json({ ok: true });
      }

      /* ---------- tablero ---------- */
      if (url.pathname === "/tablero" && req.method === "GET") {
        const clave = String(env.CLAVE_TABLERO || "");
        if (!clave || url.searchParams.get("clave") !== clave) {
          return new Response("No.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
        if (!env.USOS) return new Response("Falta conectar el almacén USOS.", { status: 500 });
        const lista = await env.USOS.list({ prefix: "m:" });
        const dias = {};
        for (const k of lista.keys) {
          const p = k.name.split(":");           // m : fecha : paso : variante
          if (p.length !== 4) continue;
          const n = Number(await env.USOS.get(k.name) || 0);
          dias[p[1]] = dias[p[1]] || {};
          dias[p[1]][p[2]] = (dias[p[1]][p[2]] || 0) + n;
          dias[p[1]][p[2] + "|" + p[3]] = (dias[p[1]][p[2] + "|" + p[3]] || 0) + n;
        }
        return new Response(tablero(dias), {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
        });
      }

      /* ---------- crear el cobro ---------- */
      if (url.pathname === "/pagar" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const folio = String(b.folio || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
        const volver = String(b.volver || "");
        const vuelveBien = permitidos.some(o => volver === o || volver.startsWith(o + "/"));
        if (!folio || !vuelveBien) return json({ ok: false, motivo: "datos" }, 400);

        const pref = {
          items: [{
            id: "orienta-diagnostico",
            title: "Diagnóstico Habítalo Orienta",
            quantity: 1, unit_price: PRECIO, currency_id: "MXN"
          }],
          external_reference: folio,
          back_urls: { success: volver, pending: volver, failure: volver },
          auto_return: "approved",
          binary_mode: true,                       // aprobado o rechazado, sin quedarse en espera
          payment_methods: {
            excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],   // sin efectivo: el acceso es inmediato
            installments: 1
          },
          statement_descriptor: "HABITALO ORIENTA"
        };
        const r = await mp("/checkout/preferences", {
          method: "POST", body: JSON.stringify(pref), headers: { "X-Idempotency-Key": "pref-" + folio }
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.init_point) return json({ ok: false, motivo: "mp" }, 502);
        await sumar("pagar", b.v);
        return json({ ok: true, url: d.init_point });
      }

      /* ---------- comprobar un pago ---------- */
      if (url.pathname === "/verificar" && req.method === "GET") {
        const id = String(url.searchParams.get("id") || "").replace(/\D/g, "");
        if (id.length < 6 || id.length > 20) return json({ ok: false, motivo: "numero" }, 400);

        const r = await mp("/v1/payments/" + id);
        if (r.status === 404 || r.status === 403) return json({ ok: false, motivo: "no_existe" });
        if (!r.ok) return json({ ok: false, motivo: r.status === 401 ? "sin_configurar" : "mp" }, 502);
        const p = await r.json();

        // que el pago sea para ti y no uno que tú hiciste a otra persona
        const miId = (token.split("-").pop() || "").replace(/\D/g, "");
        const cobrador = String((p.collector_id != null ? p.collector_id : (p.collector && p.collector.id)) || "");
        if (miId && cobrador && cobrador !== miId) return json({ ok: false, motivo: "no_existe" });

        if (p.status === "pending" || p.status === "in_process" || p.status === "authorized") return json({ ok: false, motivo: "pendiente" });
        if (p.status !== "approved") return json({ ok: false, motivo: "no_aprobado" });
        if (p.currency_id !== "MXN" || Number(p.transaction_amount) + 0.001 < PRECIO) return json({ ok: false, motivo: "monto" });
        const dias = (Date.now() - Date.parse(p.date_approved || p.date_created)) / 86400000;
        if (!(dias <= Number(env.DIAS || 30))) return json({ ok: false, motivo: "vencido" });

        if (env.USOS) {
          const k = "pago:" + id;
          const n = Number(await env.USOS.get(k) || 0);
          if (n >= Number(env.MAX_USOS || 5)) return json({ ok: false, motivo: "usado" });
          await env.USOS.put(k, String(n + 1), { expirationTtl: 60 * 60 * 24 * 90 });
        }
        await sumar("pago", url.searchParams.get("v"));
        return json({ ok: true, folio: p.external_reference || null });
      }

      return json({ ok: false, motivo: "ruta" }, 404);
    } catch (e) {
      return json({ ok: false, motivo: "interno" }, 500);
    }
  }
};

/* ------------------------------------------------------------------
   El tablero. Una tabla por día con cuánta gente llegó y hasta dónde
   llegó. No hay nada de nadie aquí: son sumas.
   ------------------------------------------------------------------ */
function tablero(dias) {
  const PASOS = [
    ["visita",    "Llegaron"],
    ["documento", "Subieron su estado de cuenta"],
    ["numeros",   "Vieron sus números"],
    ["pagar",     "Le dieron a pagar"],
    ["pago",      "Pagaron"]
  ];
  const VAR = [["casa", "casa"], ["fecha", "fecha"], ["antes", "antes"], ["otra", "sin variante"]];
  const fechas = Object.keys(dias).sort().reverse();
  const esc = (t) => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const tot = {};
  for (const f of fechas) for (const k in dias[f]) tot[k] = (tot[k] || 0) + dias[f][k];

  const pct = (a, b) => (b > 0 ? (a / b * 100).toFixed(1) + "%" : "—");

  const filaDia = (f) => {
    const d = dias[f] || {};
    return "<tr><th>" + esc(f) + "</th>" +
      PASOS.map(([k]) => "<td>" + (d[k] || 0) + "</td>").join("") +
      "<td class=\"conv\">" + pct(d.pago || 0, d.visita || 0) + "</td></tr>";
  };

  const filaVar = (v, etiqueta) => {
    const g = (k) => tot[k + "|" + v] || 0;
    return "<tr><th>" + esc(etiqueta) + "</th>" +
      PASOS.map(([k]) => "<td>" + g(k) + "</td>").join("") +
      "<td class=\"conv\">" + pct(g("pago"), g("visita")) + "</td></tr>";
  };

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Habítalo Orienta · cómo va</title>
<style>
 :root{color-scheme:light dark;}
 body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;padding:22px 16px 60px;
      background:#F4F6F9;color:#14243F;}
 @media (prefers-color-scheme:dark){ body{background:#0F1724;color:#E7ECF4;} table{background:#16202F;} }
 .caja{max-width:900px;margin:0 auto;}
 h1{font-size:21px;margin:0 0 4px;}
 p.sub{margin:0 0 20px;color:#5A6376;font-size:14.5px;}
 h2{font-size:14px;letter-spacing:.05em;text-transform:uppercase;color:#9A6F15;margin:26px 0 8px;}
 table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #DDE2EA;border-radius:5px;overflow:hidden;}
 th,td{padding:8px 10px;font-size:14.5px;text-align:right;border-top:1px solid #E9EDF3;font-variant-numeric:tabular-nums;}
 thead th{background:#1B2E4F;color:#F2F5F9;text-align:right;font-weight:600;font-size:12.5px;line-height:1.25;border:0;}
 tbody th, thead th:first-child{text-align:left;}
 tbody th{font-weight:600;white-space:nowrap;}
 tr.total td, tr.total th{font-weight:700;background:#FBF5E6;color:#14243F;}
 td.conv{color:#2C6E52;font-weight:700;}
 .nota{margin-top:22px;font-size:13.5px;color:#5A6376;line-height:1.55;}
</style></head><body><div class="caja">
<h1>Habítalo Orienta · cómo va</h1>
<p class="sub">Contadores propios. Sin cookies y sin nada que identifique a nadie: solo cuántas veces pasó cada cosa.</p>

<h2>Día por día</h2>
<table><thead><tr><th>Día</th>${PASOS.map(([, e]) => "<th>" + e + "</th>").join("")}<th>Pagan de los que llegan</th></tr></thead>
<tbody>
${fechas.length ? fechas.map(filaDia).join("\n") : '<tr><td colspan="7" style="text-align:left;color:#5A6376">Todavía no hay nada que contar.</td></tr>'}
<tr class="total"><th>Total</th>${PASOS.map(([k]) => "<td>" + (tot[k] || 0) + "</td>").join("")}<td class="conv">${pct(tot.pago || 0, tot.visita || 0)}</td></tr>
</tbody></table>

<h2>Por variante del anuncio</h2>
<table><thead><tr><th>Variante</th>${PASOS.map(([, e]) => "<th>" + e + "</th>").join("")}<th>Pagan de los que llegan</th></tr></thead>
<tbody>${VAR.map(([v, e]) => filaVar(v, e)).join("\n")}</tbody></table>

<p class="nota">«Llegaron» cuenta una vez por pestaña, no por persona: si alguien recarga en otra pestaña, cuenta dos.
Los pasos se cuentan una sola vez por pestaña. «Le dieron a pagar» y «Pagaron» los cuenta el propio verificador,
así que esos dos no dependen del navegador de nadie. Los contadores se guardan 400 días.</p>
</div></body></html>`;
}
