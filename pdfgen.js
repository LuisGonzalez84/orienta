/* Generador de PDF sin dependencias — Diagnóstico Habítalo Orienta.
   Emite un PDF 1.4 con Helvetica/Helvetica-Bold y WinAnsiEncoding.
   El mismo código corre en el navegador (no sale nada del dispositivo).

   Todas las cifras llegan ya calculadas y formateadas por el motor de la
   página: aquí no se calcula nada, solo se dibuja. Las proporciones de las
   gráficas llegan como fracciones de 0 a 1. */

(function(root, factory){
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.OrientaPDF = factory();
})(typeof self !== "undefined" ? self : this, function(){
  "use strict";

  var W = 612, H = 792;                       // carta, en puntos
  var MARGEN = 54;
  var ANCHO = W - MARGEN * 2;
  var PIE = H - 34;

  /* --- WinAnsiEncoding: latin-1 salvo el tramo 0x80-0x9F --- */
  var WIN = {"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,
             "Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,
             "–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
  function esc(s){
    var out = "";
    s = String(s);
    for (var i = 0; i < s.length; i++){
      var ch = s[i], c = s.charCodeAt(i);
      if (WIN[ch] !== undefined) c = WIN[ch];
      else if (c > 255) c = 63;               // fuera de WinAnsi -> '?'
      if (c === 40 || c === 41 || c === 92) out += "\\";
      out += (c < 256 && c > 126) ? "\\" + ("00" + c.toString(8)).slice(-3)
                                  : String.fromCharCode(c);
    }
    return out;
  }

  /* --- anchos de Helvetica (afm), para medir y partir renglones --- */
  var AW = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,
            556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,
            722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,
            278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
            556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var AWB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,
             556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,
             722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,
             278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
             611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  function ancho(s, size, bold){
    var t = bold ? AWB : AW, w = 0;
    s = String(s);
    for (var i = 0; i < s.length; i++){
      var c = s.charCodeAt(i);
      w += (c >= 32 && c <= 126) ? t[c - 32] : (c === 8212 ? 1000 : 556);
    }
    return w * size / 1000;
  }
  function partir(texto, size, bold, max){
    var pal = String(texto).split(/\s+/), lin = [], act = "";
    for (var i = 0; i < pal.length; i++){
      var pr = act ? act + " " + pal[i] : pal[i];
      if (ancho(pr, size, bold) > max && act){ lin.push(act); act = pal[i]; }
      else act = pr;
    }
    if (act) lin.push(act);
    return lin;
  }

  /* --- página: acumula operadores de contenido --- */
  function Pagina(){ this.ops = []; }
  Pagina.prototype.texto = function(x, y, s, o){
    o = o || {};
    var size = o.size || 10, bold = !!o.bold, c = o.color || [0.08, 0.14, 0.25];
    s = String(s);
    if (o.align === "right") x -= ancho(s, size, bold);
    else if (o.align === "center") x -= ancho(s, size, bold) / 2;
    this.ops.push("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " +
                  c[0].toFixed(3) + " " + c[1].toFixed(3) + " " + c[2].toFixed(3) + " rg " +
                  x.toFixed(2) + " " + (H - y).toFixed(2) + " Td (" + esc(s) + ") Tj ET");
    return this;
  };
  Pagina.prototype.parrafo = function(x, y, s, o){
    o = o || {};
    var size = o.size || 10, alto = o.alto || size * 1.45;
    var lin = partir(s, size, !!o.bold, o.max || ANCHO);
    for (var i = 0; i < lin.length; i++) this.texto(x, y + i * alto, lin[i], o);
    return y + lin.length * alto;
  };
  Pagina.prototype.caja = function(x, y, w, h, c){
    this.ops.push(c[0].toFixed(3) + " " + c[1].toFixed(3) + " " + c[2].toFixed(3) + " rg " +
                  x.toFixed(2) + " " + (H - y - h).toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re f");
    return this;
  };
  Pagina.prototype.linea = function(x1, y1, x2, y2, c, gr){
    c = c || [0.85, 0.87, 0.90];
    this.ops.push((gr || 0.7) + " w " + c[0].toFixed(3) + " " + c[1].toFixed(3) + " " + c[2].toFixed(3) +
                  " RG " + x1.toFixed(2) + " " + (H - y1).toFixed(2) + " m " +
                  x2.toFixed(2) + " " + (H - y2).toFixed(2) + " l S");
    return this;
  };

  /* --- ensamblado del archivo --- */
  function construir(paginas){
    var objs = [], N = paginas.length;
    var idsPag = [], idsCont = [];
    for (var i = 0; i < N; i++){ idsPag.push(4 + i * 2); idsCont.push(5 + i * 2); }

    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[2] = "<< /Type /Pages /Kids [" + idsPag.map(function(id){ return id + " 0 R"; }).join(" ") +
              "] /Count " + N + " >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    var idBold = 4 + N * 2;
    objs[idBold] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    for (i = 0; i < N; i++){
      var cont = paginas[i].ops.join("\n");
      objs[idsPag[i]] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W + " " + H + "] " +
                        "/Resources << /Font << /F1 3 0 R /F2 " + idBold + " 0 R >> >> " +
                        "/Contents " + idsCont[i] + " 0 R >>";
      objs[idsCont[i]] = "<< /Length " + cont.length + " >>\nstream\n" + cont + "\nendstream";
    }

    var out = "%PDF-1.4\n", pos = [];
    for (i = 1; i < objs.length; i++){
      if (!objs[i]) continue;
      pos[i] = out.length;
      out += i + " 0 obj\n" + objs[i] + "\nendobj\n";
    }
    var xref = out.length, max = objs.length;
    out += "xref\n0 " + max + "\n0000000000 65535 f \n";
    for (i = 1; i < max; i++){
      out += objs[i] ? ("0000000000" + pos[i]).slice(-10) + " 00000 n \n"
                     : "0000000000 65535 f \n";
    }
    out += "trailer\n<< /Size " + max + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";

    var bytes = new Uint8Array(out.length);
    for (i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
    return bytes;
  }

  /* ================= paleta ================= */
  var NAVY  = [0.106, 0.180, 0.310], ORO   = [0.604, 0.439, 0.121],
      TINTA = [0.078, 0.141, 0.247], SUAVE = [0.329, 0.380, 0.478],
      TENUE = [0.541, 0.584, 0.659], CREMA = [0.973, 0.945, 0.871],
      NIEVE = [0.960, 0.968, 0.980], ORO_C = [0.878, 0.737, 0.376],
      VERDE = [0.173, 0.431, 0.322], RAYA  = [0.918, 0.929, 0.949];

  /* ================= piezas ================= */
  function encabezado(p, titulo, folio, fecha){
    p.caja(0, 0, W, 84, NAVY);
    p.texto(MARGEN, 36, "HABÍTALO ORIENTA", {size: 16, bold: true, color: [0.95, 0.96, 0.98]});
    p.texto(MARGEN, 56, titulo, {size: 10.5, color: [0.74, 0.79, 0.86]});
    p.texto(W - MARGEN, 36, folio, {size: 9, align: "right", color: [0.86, 0.67, 0.29]});
    p.texto(W - MARGEN, 52, fecha, {size: 9, align: "right", color: [0.74, 0.79, 0.86]});
  }
  function pie(p, nota, n, de){
    p.texto(MARGEN, PIE, nota, {size: 8, color: TENUE});
    p.texto(W - MARGEN, PIE, "Página " + n + " de " + de, {size: 8, align: "right", color: TENUE});
  }
  function seccion(p, y, titulo){
    p.texto(MARGEN, y, String(titulo).toUpperCase(), {size: 9, bold: true, color: ORO});
    p.linea(MARGEN, y + 7, W - MARGEN, y + 7, [0.84, 0.80, 0.70]);
    return y + 24;
  }
  function fila(p, y, etiqueta, valor){
    p.texto(MARGEN, y, etiqueta, {size: 9.5, color: SUAVE});
    p.texto(W - MARGEN, y, valor, {size: 9.5, bold: true, align: "right", color: TINTA});
    p.linea(MARGEN, y + 5, W - MARGEN, y + 5, RAYA, 0.5);
    return y + 17;
  }
  /* fila compacta para dos columnas */
  function fila2(p, x, w, y, etiqueta, valor){
    p.texto(x, y, etiqueta, {size: 8.5, color: SUAVE});
    p.texto(x + w, y, valor, {size: 8.5, bold: true, align: "right", color: TINTA});
    p.linea(x, y + 5, x + w, y + 5, RAYA, 0.5);
    return y + 15;
  }
  function vinetas(p, y, items, size){
    size = size || 9.5;
    for (var i = 0; i < items.length; i++){
      p.texto(MARGEN + 4, y, "•", {size: size, color: ORO});
      y = p.parrafo(MARGEN + 16, y, items[i], {size: size, color: SUAVE, max: ANCHO - 16, alto: size * 1.4}) + 6;
    }
    return y;
  }

  /* cuatro recuadros en hilera */
  function mosaico(p, y, tiles){
    var n = tiles.length, hueco = 10, w = (ANCHO - hueco * (n - 1)) / n, alto = 56;
    for (var i = 0; i < n; i++){
      var x = MARGEN + i * (w + hueco);
      p.caja(x, y, w, alto, NIEVE);
      p.caja(x, y, 2.5, alto, i === 0 ? ORO : NAVY);
      var v = String(tiles[i][0]), s = 15;
      while (ancho(v, s, true) > w - 22 && s > 8) s -= 0.5;
      p.texto(x + 11, y + 23, v, {size: s, bold: true, color: TINTA});
      p.parrafo(x + 11, y + 37, tiles[i][1], {size: 7.5, color: SUAVE, max: w - 20, alto: 9.5});
    }
    return y + alto + 16;
  }

  /* barra de dos tramos: qué parte es capital y qué parte son intereses */
  function barra(p, y, fracA, etA, valA, etB, valB){
    var alto = 34, wA = Math.max(6, Math.min(ANCHO - 6, ANCHO * fracA)), wB = ANCHO - wA;
    p.caja(MARGEN, y, wA, alto, NAVY);
    p.caja(MARGEN + wA, y, wB, alto, ORO_C);
    p.texto(MARGEN + 9, y + 15, valA, {size: 11, bold: true, color: [1, 1, 1]});
    p.texto(MARGEN + 9, y + 27, etA, {size: 7.5, color: [0.80, 0.84, 0.90]});
    p.texto(MARGEN + wA + 9, y + 15, valB, {size: 11, bold: true, color: [0.16, 0.12, 0.03]});
    p.texto(MARGEN + wA + 9, y + 27, etB, {size: 7.5, color: [0.33, 0.26, 0.08]});
    return y + alto + 12;
  }

  /* Escalera: qué PORCENTAJE de lo que pagas cada año se abona a capital.
     Lleva eje de 0 a 100%, la referencia de la mitad, y etiquetas en el
     primer año, el año del cruce y el último, para que se lea sola. */
  function escalera(p, y, anios, pcts, idx){
    var ejeW = 26;
    var x0 = MARGEN + ejeW, anchoG = (W - MARGEN) - x0;
    var arriba = y + 12, alto = 64, base = arriba + alto;
    var n = anios.length, hueco = n > 22 ? 1 : 2, w = (anchoG - hueco * (n - 1)) / n;
    var i;

    /* rejilla y eje de porcentaje */
    var marcas = [0, 50, 100];
    for (i = 0; i < marcas.length; i++){
      var v = marcas[i], yy = base - alto * v / 100;
      p.linea(x0, yy, W - MARGEN, yy, v === 50 ? [0.80, 0.72, 0.52] : [0.88, 0.90, 0.93], v === 50 ? 0.8 : 0.5);
      p.texto(x0 - 5, yy + 3, v + "%", {size: 7, align: "right", color: v === 50 ? ORO : TENUE});
    }

    /* barras */
    for (i = 0; i < n; i++){
      var h = Math.max(1.2, alto * Math.min(100, pcts[i]) / 100);
      var x = x0 + i * (w + hueco);
      p.caja(x, base - h, w, h, (idx >= 0 && i >= idx) ? ORO_C : [0.62, 0.68, 0.78]);
    }

    /* la referencia de la mitad, encima de las barras para que no se pierda */
    var y50 = base - alto * 0.5;
    p.linea(x0, y50, W - MARGEN, y50, [0.45, 0.33, 0.09], 0.9);
    p.linea(x0, base, W - MARGEN, base, [0.72, 0.76, 0.82], 0.9);

    /* etiquetas de porcentaje en los años que importan */
    function etiqueta(k, bold){
      if (k < 0 || k >= n) return;
      var hh = alto * Math.min(100, pcts[k]) / 100;
      p.texto(x0 + k * (w + hueco) + w / 2, base - hh - 4, Math.round(pcts[k]) + "%",
              {size: 7.5, bold: !!bold, align: "center",
               color: (idx >= 0 && k >= idx) ? ORO : SUAVE});
    }
    etiqueta(0);
    if (idx > 1 && idx < n - 2) etiqueta(idx, true);
    etiqueta(n - 1);

    /* años */
    p.texto(x0, base + 11, String(anios[0]), {size: 7.5, color: TENUE});
    p.texto(W - MARGEN, base + 11, String(anios[n - 1]), {size: 7.5, align: "right", color: TENUE});
    if (idx > 1 && idx < n - 2){
      var xc = x0 + idx * (w + hueco) + w / 2;
      p.texto(xc, base + 11, String(anios[idx]), {size: 8, bold: true, align: "center", color: ORO});
      p.texto(xc, base + 22, "aquí llegas a la mitad", {size: 7.5, align: "center", color: ORO});
      return base + 34;
    }
    return base + 22;
  }

  /* línea del tiempo: hoy -> fin sin abonar, con el tramo que te ahorras */
  function tiempo(p, y, fracAb, hoy, fAb, fFin, ganas){
    var x0 = MARGEN + 4, x1 = W - MARGEN - 4, L = x1 - x0;
    var xa = x0 + L * Math.max(0.10, Math.min(0.80, fracAb));
    var yl = y + 22;
    if (xa < x1) p.caja(xa, yl - 7, x1 - xa, 14, CREMA);
    p.linea(x0, yl, x1, yl, [0.72, 0.76, 0.82], 2);
    [[x0, hoy], [xa, fAb], [x1, fFin]].forEach(function(m, i){
      p.caja(m[0] - 1.5, yl - 6, 3, 12, i === 1 ? ORO : NAVY);
    });
    p.texto(x0, yl - 12, hoy, {size: 8, bold: true, color: NAVY});
    p.texto(xa, yl - 12, fAb, {size: 8, bold: true, align: "center", color: ORO});
    p.texto(x1, yl - 12, fFin, {size: 8, bold: true, align: "right", color: NAVY});
    p.texto(x0, yl + 18, "hoy", {size: 7.5, color: TENUE});
    p.texto(xa, yl + 18, "abonando", {size: 7.5, align: "center", color: TENUE});
    p.texto(x1, yl + 18, "sin abonar", {size: 7.5, align: "right", color: TENUE});
    p.texto(x1, yl + 32, ganas, {size: 9.5, bold: true, align: "right", color: ORO});
    return yl + 48;
  }

  /* tabla genérica: cols = [[titulo, ancho, alineación]] */
  function tabla(p, y, cols, filas, o){
    o = o || {};
    var size = o.size || 8.5, alto = o.alto || 15, x, i, j;
    var total = 0; for (i = 0; i < cols.length; i++) total += cols[i][1];
    var esc_ = ANCHO / total;
    function xs(k){ var a = MARGEN; for (var q = 0; q < k; q++) a += cols[q][1] * esc_; return a; }
    for (i = 0; i < cols.length; i++){
      x = cols[i][2] === "right" ? xs(i) + cols[i][1] * esc_ : xs(i);
      p.texto(x, y, cols[i][0], {size: 7.5, bold: true, color: TENUE, align: cols[i][2] || "left"});
    }
    p.linea(MARGEN, y + 5, W - MARGEN, y + 5, [0.80, 0.83, 0.88], 0.8);
    y += 15;
    for (j = 0; j < filas.length; j++){
      var f = filas[j], res = o.resalta && o.resalta.indexOf(j) >= 0;
      if (res) p.caja(MARGEN - 4, y - 9, ANCHO + 8, alto, CREMA);
      else if (j % 2 === 1) p.caja(MARGEN - 4, y - 9, ANCHO + 8, alto, [0.976, 0.980, 0.988]);
      for (i = 0; i < cols.length; i++){
        x = cols[i][2] === "right" ? xs(i) + cols[i][1] * esc_ : xs(i);
        p.texto(x, y, f[i], {size: size, bold: res || i === 0, align: cols[i][2] || "left",
                             color: res ? TINTA : (i === 0 ? TINTA : SUAVE)});
      }
      y += alto;
    }
    p.linea(MARGEN, y - 9, W - MARGEN, y - 9, [0.80, 0.83, 0.88], 0.8);
    return y + 6;
  }

  /* ================= el documento =================
     d lleva TODO ya calculado por el motor. Ver datosPDF() en la página. */
  function diagnostico(d){
    var DE = 4, y, i;

    /* ---------- 1. el hallazgo ---------- */
    var p1 = new Pagina();
    encabezado(p1, "Diagnóstico de tu crédito Infonavit", d.folio, d.fecha);

    y = 116;
    y = seccion(p1, y, "Lo primero que tienes que saber");
    p1.texto(MARGEN, y + 12, "De cada $100 que entran a tu crédito este año,", {size: 15, color: TINTA});
    p1.texto(MARGEN, y + 36, "solo $" + d.pctCapital + " bajan tu deuda.", {size: 21, bold: true, color: TINTA});
    y = p1.parrafo(MARGEN, y + 58, "Los otros $" + d.pctInteres +
        " son intereses, seguros y comisiones. En los próximos 12 meses entrarán " +
        d.doce.entra + " a tu crédito y tu deuda bajará " + d.doce.capital + ".",
        {size: 10, color: SUAVE, max: ANCHO}) + 14;

    y = seccion(p1, y, "Porcentaje de tu pago que se abona a capital, año por año");
    y = p1.parrafo(MARGEN, y - 10, "Cada barra es un año. La altura es qué parte de lo que pagas ese año " +
        "baja tu deuda; el resto son intereses, seguros y comisiones.",
        {size: 8.5, color: TENUE, max: ANCHO}) + 4;
    y = escalera(p1, y, d.escalera.anios, d.escalera.pcts, d.escalera.idx);
    y = p1.parrafo(MARGEN, y, d.noSeQueda, {size: 9, color: SUAVE, max: ANCHO}) + 14;

    y = seccion(p1, y, "Lo que te falta pagar, repartido");
    y = barra(p1, y, d.barraFrac, "lo que debes de capital", d.capitalPend,
              "intereses, seguros y comisiones", d.costo);
    y = p1.parrafo(MARGEN, y, d.barraNota, {size: 8.5, color: TENUE, max: ANCHO}) + 14;

    y = seccion(p1, y, "Así vas hoy, sin cambiar nada");
    y = mosaico(p1, y, [
      [d.tiempo, "te faltan, al ritmo de hoy: " + d.pagosTxt],
      [d.fechaFin, "terminarías de pagar, solo con tu descuento"],
      [d.costo, "pagarías de intereses, seguros y cuotas"],
      [d.patronal, "pone tu patrón cada mes, además de tu descuento"]
    ]);

    y = seccion(p1, y, "Para dimensionarlo");
    y = fila(p1, y, "Tu crédito genera, cada día que pasa", d.porDia);
    y = fila(p1, y, "Lo que pagarías de intereses, repartido en el plazo", d.mensualizado + " al mes");
    y = fila(p1, y, "Lo que pondrá tu patrón en todo lo que te falta", d.patronalTotal);
    y = fila(p1, y, "Por cada $100 que debes hoy, pagarás además", d.porCien);

    pie(p1, "Habítalo Orienta · No es una institución financiera ni está afiliada al Infonavit.", 1, DE);

    /* ---------- 2. lo que puedes cambiar ---------- */
    var p2 = new Pagina();
    encabezado(p2, "Lo que puedes cambiar", d.folio, d.fecha);

    y = 116;
    y = seccion(p2, y, "Si abonas " + d.elegido.abono + " cada mes");
    y = tiempo(p2, y, d.tiempoFrac, d.hoyMes, d.elegido.fin, d.fechaFin, d.elegido.ganas);
    y = p2.parrafo(MARGEN, y, "Abonando " + d.elegido.abono + " al mes terminarías en " +
        d.elegido.fin + ": terminas " + d.elegido.antes + " antes (" + d.elegido.menosTxt +
        " menos) y dejarías de pagar " +
        d.elegido.ahorro + " de intereses y cargos." +
        (d.cruceAb && d.cruceGana > 0
          ? (" Y el punto en que la mitad de lo que pagas ya baja tu deuda se adelanta de " +
             d.cruce + " a " + d.cruceAb + ": " + d.cruceGana +
             (d.cruceGana === 1 ? " año antes." : " años antes."))
          : ""),
        {size: 10, color: TINTA, max: ANCHO}) + 18;

    y = seccion(p2, y, "Otros montos, para que compares");
    y = tabla(p2, y, [["Si abonas al mes", 30, "left"], ["Terminas en", 22, "left"],
                      ["Te faltarían", 22, "right"], ["Terminas antes", 22, "right"], ["Te ahorras", 18, "right"]],
              d.escenarios, {resalta: d.escenarioElegido >= 0 ? [d.escenarioElegido] : [], alto: 17});
    y = p2.parrafo(MARGEN, y, "Cada renglón es una corrida completa de tu crédito con ese abono.",
        {size: 8.5, color: TENUE, max: ANCHO}) + 16;

    y = seccion(p2, y, "Lo que cuesta esperar");
    p2.caja(MARGEN, y - 12, ANCHO, 58, CREMA);
    y = p2.parrafo(MARGEN + 12, y, d.esperar, {size: 10, color: TINTA, max: ANCHO - 24}) + 26;

    y = seccion(p2, y, "Qué sí puedes hacer");
    y = vinetas(p2, y, d.acciones);

    pie(p2, "Habítalo Orienta · Proyección con supuestos, no una cotización del Infonavit.", 2, DE);

    /* ---------- 3. cómo comprobar: pagos, predicción e insumos ---------- */
    var p3 = new Pagina();
    encabezado(p3, "Cómo comprobar estos números", d.folio, d.fecha);

    y = 116;
    y = seccion(p3, y, "Tus siguientes pagos " + d.frecuencia + ", uno por uno");
    y = tabla(p3, y, [["Pago", 9, "left"], ["Fecha", 18, "left"], ["Días", 9, "right"],
                      ["Entra", 19, "right"], ["Comisiones", 16, "right"],
                      ["Intereses", 17, "right"], ["A capital", 16, "right"], ["Saldo", 20, "right"]],
              d.primeros.slice(0, 6), {alto: 13.5, size: 8});
    y = p3.parrafo(MARGEN, y, "Cada pago se aplica en este orden: primero comisiones, luego intereses, " +
        "y lo que sobra baja tu deuda. Los días se cuentan con base 30/360.",
        {size: 8.5, color: TENUE, max: ANCHO}) + 14;

    y = seccion(p3, y, "Compruébalo contra tu próximo estado de cuenta");
    p3.caja(MARGEN, y - 12, ANCHO, 50, CREMA);
    y = p3.parrafo(MARGEN + 12, y, d.prediccion, {size: 9.5, color: TINTA, max: ANCHO - 24}) + 24;

    y = seccion(p3, y, "De dónde salen estos números");
    var hueco = 22, wc = (ANCHO - hueco) / 2, xa = MARGEN, xb = MARGEN + wc + hueco;
    p3.texto(xa, y - 6, "Lo que dice tu estado de cuenta", {size: 8, bold: true, color: TENUE});
    p3.texto(xb, y - 6, "Lo que dedujimos de tus movimientos", {size: 8, bold: true, color: TENUE});
    var ded = d.deducido.filter(function(f){ return !/Salario mensual integrado/.test(f[0]); });
    var ya = y + 10, yb = y + 10;
    for (i = 0; i < d.capturado.length; i++) ya = fila2(p3, xa, wc, ya, d.capturado[i][0], d.capturado[i][1]);
    for (i = 0; i < ded.length; i++) yb = fila2(p3, xb, wc, yb, ded[i][0], ded[i][1]);
    y = Math.max(ya, yb) + 10;

    p3.texto(MARGEN, y, "Los pagos que usamos para proyectar", {size: 8, bold: true, color: TENUE});
    y += 16;
    var usados = d.movimientos.filter(function(f){ return /^Pago \d/.test(f[0]) || /Días|Sueldo/.test(f[0]); });
    for (i = 0; i < usados.length; i++) y = fila2(p3, xa, wc, y, usados[i][0], usados[i][1]);
    y = p3.parrafo(MARGEN, y + 4, "Si alguno de estos datos no corresponde a tu caso, escríbenos: el diagnóstico cambia.",
        {size: 8.5, color: TENUE, max: ANCHO});

    pie(p3, "Habítalo Orienta · Cada cifra de este documento sale de estos insumos.", 3, DE);

    /* ---------- 4. avisos y constancia ---------- */
    var p4 = new Pagina();
    encabezado(p4, "Lo que tienes que tomar en cuenta", d.folio, d.fecha);

    y = 116;
    y = seccion(p4, y, "Antes de decidir");
    y = vinetas(p4, y, d.avisos, 9);

    y += 6;
    y = seccion(p4, y, "Lo que este documento no es");
    y = vinetas(p4, y, [
      "No es asesoría legal ni fiscal. Si tu caso toca sucesión, copropiedad, litigio, escrituración o impuestos, eso lo ve un especialista aliado.",
      "No es asesoría de inversión ni una recomendación de contratar ningún producto financiero.",
      "No es un estado de cuenta ni un documento emitido por el Infonavit."
    ], 9);

    y += 8;
    p4.caja(MARGEN, y - 12, ANCHO, 44, NIEVE);
    y = p4.parrafo(MARGEN + 12, y, "Tus datos no se guardaron. Tu estado de cuenta se leyó dentro de tu " +
        "dispositivo y este documento se armó ahí mismo: tu nombre, NSS, RFC, CURP y domicilio nunca " +
        "salieron de tu equipo.", {size: 9, color: SUAVE, max: ANCHO - 24}) + 22;

    y = seccion(p4, y, "Constancia");
    y = fila(p4, y, "Folio", d.folio);
    y = fila(p4, y, "Fecha de emisión", d.fecha);
    y = fila(p4, y, "Versión del motor de cálculo", d.motor);
    y = fila(p4, y, "Versión del aviso de privacidad", d.avisoVersion);
    y = fila(p4, y, "Consentimiento registrado", d.consentido);

    pie(p4, "Habítalo Orienta · No es una institución financiera ni está afiliada al Infonavit.", 4, DE);

    return construir([p1, p2, p3, p4]);
  }

  return {diagnostico: diagnostico, construir: construir, Pagina: Pagina, VERSION: "1.4"};
});
