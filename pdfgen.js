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
  /* Las letras con acento miden lo mismo que su letra base en Helvetica
     (í = i, á = a, Ñ = N). Medirlas bien importa: el párrafo con énfasis
     coloca cada palabra a mano y un ancho de más deja huecos visibles. */
  var ESPECIAL = {"¿":611, "¡":333, "·":278, "—":1000, "–":556, "°":400,
                  "“":333, "”":333, "‘":222, "’":222, "•":350, "€":556};
  function ancho(s, size, bold){
    var t = bold ? AWB : AW, w = 0;
    s = String(s);
    for (var i = 0; i < s.length; i++){
      var ch = s[i], c = s.charCodeAt(i);
      if (c >= 32 && c <= 126){ w += t[c - 32]; continue; }
      if (ESPECIAL[ch] !== undefined){ w += ESPECIAL[ch]; continue; }
      var b = ch.normalize ? ch.normalize("NFD").charCodeAt(0) : 0;
      w += (b >= 32 && b <= 126) ? t[b - 32] : 556;
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

  Pagina.prototype.imagen = function(x, y, w, h){
    this.ops.push("q " + w.toFixed(2) + " 0 0 " + h.toFixed(2) + " " +
                  x.toFixed(2) + " " + (H - y - h).toFixed(2) + " cm /Im1 Do Q");
    return this;
  };

  /* --- logo --- */
  function desbase64(s){
    if (typeof atob === "function") return atob(s);
    return Buffer.from(s, "base64").toString("binary");   // Node, solo para pruebas
  }
  /* Logo Habítalo México, ya compuesto sobre el azul del encabezado.
     Imagen RGB de 240×132 comprimida (zlib) y codificada en base64. */
  var LOGO = { w: 240, h: 132, datos:
    "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" };

  /* --- ensamblado del archivo --- */
  function construir(paginas){
    var objs = [], N = paginas.length;
    var idsPag = [], idsCont = [];
    for (var i = 0; i < N; i++){ idsPag.push(4 + i * 2); idsCont.push(5 + i * 2); }

    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[2] = "<< /Type /Pages /Kids [" + idsPag.map(function(id){ return id + " 0 R"; }).join(" ") +
              "] /Count " + N + " >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    var idBold = 4 + N * 2, idLogo = idBold + 1;

    objs[idBold] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    var bin = desbase64(LOGO.datos);
    objs[idLogo] = "<< /Type /XObject /Subtype /Image /Width " + LOGO.w + " /Height " + LOGO.h +
                   " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length " +
                   bin.length + " >>\nstream\n" + bin + "\nendstream";

    for (i = 0; i < N; i++){
      var cont = paginas[i].ops.join("\n");
      objs[idsPag[i]] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W + " " + H + "] " +
                        "/Resources << /Font << /F1 3 0 R /F2 " + idBold + " 0 R >> " +
                        "/XObject << /Im1 " + idLogo + " 0 R >> >> " +
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
    var hLogo = 42, wLogo = hLogo * LOGO.w / LOGO.h, x = MARGEN;
    p.imagen(x, (84 - hLogo) / 2, wLogo, hLogo);
    x += wLogo + 9;
    p.linea(x, 27, x, 57, [0.24, 0.32, 0.46], 0.8);
    x += 13;
    p.texto(x, 36, "HABÍTALO ORIENTA", {size: 16, bold: true, color: [0.95, 0.96, 0.98]});
    p.texto(x, 56, titulo, {size: 10.5, color: [0.74, 0.79, 0.86]});
    p.texto(W - MARGEN, 36, folio, {size: 9, align: "right", color: [0.86, 0.67, 0.29]});
    p.texto(W - MARGEN, 52, fecha, {size: 9, align: "right", color: [0.74, 0.79, 0.86]});
  }
  function pie(p, nota, n, de){
    p.texto(MARGEN, PIE, nota, {size: 8, color: TENUE});
    p.texto(W - MARGEN, PIE, "Página " + n + " de " + de, {size: 8, align: "right", color: TENUE});
  }
  function seccion(p, y, titulo){
    p.texto(MARGEN, y, String(titulo).toUpperCase(), {size: 8.5, bold: true, color: SUAVE});
    p.linea(MARGEN, y + 7, W - MARGEN, y + 7, [0.84, 0.86, 0.90]);
    return y + 24;
  }
  function fila(p, y, etiqueta, valor){
    p.texto(MARGEN, y, etiqueta, {size: 9.5, color: SUAVE});
    p.texto(W - MARGEN, y, valor, {size: 9.5, bold: true, align: "right", color: TINTA});
    p.linea(MARGEN, y + 5, W - MARGEN, y + 5, RAYA, 0.5);
    return y + 17;
  }
  /* Párrafo con énfasis en línea. **texto** va en negritas del color fuerte;
     ^^texto^^ va en negritas doradas. Solo se parte renglón donde hay espacio,
     así "$654,472." nunca queda separado de su punto. */
  function parrafoRico(p, x, y, s, o){
    o = o || {};
    var size = o.size || 10, alto = o.alto || size * 1.45, max = o.max || ANCHO;
    var base = o.color || TINTA, fuerte = o.fuerte || TINTA;
    var segs = [], re = /\*\*([^*]+)\*\*|\^\^([^\^]+)\^\^/g, m, ult = 0;
    s = String(s);
    while ((m = re.exec(s))){
      if (m.index > ult) segs.push({t: s.slice(ult, m.index), k: 0});
      segs.push({t: m[1] || m[2], k: m[1] ? 1 : 2}); ult = re.lastIndex;
    }
    if (ult < s.length) segs.push({t: s.slice(ult), k: 0});
    var grupos = [], esp = false;
    segs.forEach(function(g){
      g.t.split(/(\s+)/).forEach(function(w){
        if (!w) return;
        if (/^\s+$/.test(w)){ esp = true; return; }
        var pz = {t: w, k: g.k};
        if (esp || !grupos.length) grupos.push([pz]); else grupos[grupos.length - 1].push(pz);
        esp = false;
      });
    });
    function wPz(pz){ return ancho(pz.t, size, !!o.bold || pz.k > 0); }
    function wGr(g){ var a = 0; g.forEach(function(pz){ a += wPz(pz); }); return a; }
    var sp = ancho(" ", size, false), lineas = [[]], anchoAct = 0;
    grupos.forEach(function(g){
      var wg = wGr(g), extra = lineas[lineas.length - 1].length ? sp : 0;
      if (anchoAct + extra + wg > max && lineas[lineas.length - 1].length){ lineas.push([g]); anchoAct = wg; }
      else { lineas[lineas.length - 1].push(g); anchoAct += extra + wg; }
    });
    for (var li = 0; li < lineas.length; li++){
      var cx = x;
      lineas[li].forEach(function(g, gi){
        if (gi) cx += sp;
        g.forEach(function(pz){
          p.texto(cx, y + li * alto, pz.t, {size: size, bold: !!o.bold || pz.k > 0,
                  color: pz.k === 2 ? ORO : (pz.k === 1 ? fuerte : base)});
          cx += wPz(pz);
        });
      });
    }
    return y + lineas.length * alto;
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
    p.caja(MARGEN + wA, y, wB, alto, [0.80, 0.83, 0.88]);
    p.texto(MARGEN + 9, y + 15, valA, {size: 11, bold: true, color: [1, 1, 1]});
    p.texto(MARGEN + 9, y + 27, etA, {size: 7.5, color: [0.80, 0.84, 0.90]});
    p.texto(MARGEN + wA + 9, y + 15, valB, {size: 11, bold: true, color: TINTA});
    p.texto(MARGEN + wA + 9, y + 27, etB, {size: 7.5, color: SUAVE});
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
    /* si las dos fechas del final quedan encimadas, la de "abonando" baja un renglón */
    var anchoAb = ancho(fAb, 8, true), anchoFin = ancho(fFin, 8, true);
    var choca = (xa + anchoAb / 2) > (x1 - anchoFin - 6);
    p.texto(x0, yl - 12, hoy, {size: 8, bold: true, color: NAVY});
    p.texto(x1, yl - 12, fFin, {size: 8, bold: true, align: "right", color: NAVY});
    p.texto(choca ? Math.min(xa, x1 - anchoFin - 6) : xa, yl + (choca ? 30 : -12), fAb,
            {size: 8, bold: true, align: choca ? "right" : "center", color: ORO});
    p.texto(x0, yl + 18, "hoy", {size: 7.5, color: TENUE});
    if(!choca) p.texto(xa, yl + 18, "abonando", {size: 7.5, align: "center", color: TENUE});
    p.texto(x1, yl + 18, "sin abonar", {size: 7.5, align: "right", color: TENUE});
    p.texto(x1, yl + 32, ganas, {size: 9.5, bold: true, align: "right", color: ORO});
    return yl + (choca ? 56 : 48);
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
    var FOL = d.muestra ? "MUESTRA · CASO INVENTADO" : d.folio;

    /* ---------- 1. el hallazgo ---------- */
    var p1 = new Pagina();
    encabezado(p1, "Diagnóstico de tu crédito Infonavit", FOL, d.fecha);

    y = 116;
    y = seccion(p1, y, "Lo primero que tienes que saber");
    p1.texto(MARGEN, y + 12, "De cada $100 que entran a tu crédito este año,", {size: 15, color: TINTA});
    p1.texto(MARGEN, y + 36, "solo $" + d.pctCapital + " bajan tu deuda.", {size: 21, bold: true, color: TINTA});
    y = parrafoRico(p1, MARGEN, y + 58, "Los otros $" + d.pctInteres +
        " son intereses, seguros y comisiones. En los próximos 12 meses entrarán **" +
        d.doce.entra + "** a tu crédito y tu deuda bajará solo **" + d.doce.capital + "**.",
        {size: 10, color: SUAVE, max: ANCHO}) + 14;

    y = seccion(p1, y, "Porcentaje de tu pago que se abona a capital, año por año");
    y = p1.parrafo(MARGEN, y - 10, "Cada barra es un año. La altura es qué parte de lo que pagas ese año " +
        "baja tu deuda; el resto son intereses, seguros y comisiones.",
        {size: 8.5, color: TENUE, max: ANCHO}) + 4;
    y = escalera(p1, y, d.escalera.anios, d.escalera.pcts, d.escalera.idx);
    y = parrafoRico(p1, MARGEN, y, d.noSeQueda, {size: 9, color: SUAVE, max: ANCHO}) + 14;

    y = seccion(p1, y, "Lo que te falta pagar, repartido");
    y = barra(p1, y, d.barraFrac, "lo que debes de capital", d.capitalPend,
              "intereses, seguros y comisiones", d.costo);
    y = parrafoRico(p1, MARGEN, y, d.barraNota, {size: 8.5, color: TENUE, max: ANCHO}) + 14;

    y = seccion(p1, y, "Así vas hoy, sin cambiar nada");
    y = mosaico(p1, y, [
      [d.tiempo, "te faltan, al ritmo de hoy: " + d.pagosTxt],
      [d.fechaFin, "terminarías de pagar, solo con tu descuento"],
      [d.costo, "pagarías de intereses, seguros y cuotas"],
      [d.patronal, "pone tu patrón cada mes, además de tu descuento"]
    ]);
    y = p1.parrafo(MARGEN, y + 2, d.aclaraFrec, {size: 8.5, color: SUAVE, max: ANCHO}) + 10;

    y = seccion(p1, y, "Para dimensionarlo");
    y = fila(p1, y, "Tu crédito genera, cada día que pasa", d.porDia);
    y = fila(p1, y, "Lo que pagarías de intereses, repartido en el plazo", d.mensualizado + " al mes");
    y = fila(p1, y, "Lo que pondrá tu patrón en todo lo que te falta", d.patronalTotal);
    y = fila(p1, y, "Por cada $100 que debes hoy, pagarás además", d.porCien);

    pie(p1, "Habítalo Orienta · No es una institución financiera ni está afiliada al Infonavit.", 1, DE);

    /* ---------- 2. lo que puedes cambiar ---------- */
    var p2 = new Pagina();
    encabezado(p2, "Lo que puedes cambiar", FOL, d.fecha);

    y = 116;
    y = seccion(p2, y, d.modalidadTitulo || ("Si abonas " + d.elegido.abono + " cada mes"));
    if (d.elegido.menos > 0){
      p2.texto(MARGEN, y + 12, "Terminas " + d.elegido.antes + " antes", {size: 21, bold: true, color: ORO});
      y = parrafoRico(p2, MARGEN, y + 34, "y dejas de pagar **" + d.elegido.ahorro + "** de intereses y cargos.",
          {size: 13, color: TINTA, max: ANCHO}) + 12;
    }
    /* el titular de arriba ya dice cuánto antes y cuánto ahorras: no se repite */
    y = tiempo(p2, y, d.tiempoFrac, d.hoyMes, d.elegido.fin, d.fechaFin,
               d.elegido.menos > 0 ? "" : d.elegido.ganas) - (d.elegido.menos > 0 ? 14 : 0);
    y = parrafoRico(p2, MARGEN, y, "Abonando " + d.elegido.abono + " " + (d.modalidad || "cada mes") +
        (d.modalidadUnica ? " el " : " a partir del ") + (d.abonoDesde || "próximo mes") + " terminarías en **" +
        d.elegido.fin + "** en vez de " + d.fechaFin + " (" + d.elegido.menosTxt + " menos)." +
        (d.cruceAb && d.cruceGana > 0
          ? (" Y el punto en que la mitad de lo que pagas ya baja tu deuda se adelanta de " +
             d.cruce + " a ^^" + d.cruceAb + "^^: " + d.cruceGana +
             (d.cruceGana === 1 ? " año antes." : " años antes."))
          : ""),
        {size: 10, color: TINTA, max: ANCHO}) + 18;

    y = seccion(p2, y, "Otros montos, para que compares");
    y = tabla(p2, y, [["Si abonas " + (d.modalidad || "cada mes"), 30, "left"], ["Terminas en", 22, "left"],
                      ["Te faltarían", 22, "right"], ["Terminas antes", 22, "right"], ["Te ahorras", 18, "right"]],
              d.escenarios, {resalta: d.escenarioElegido >= 0 ? [d.escenarioElegido] : [], alto: 17});
    y = p2.parrafo(MARGEN, y, "Cada renglón es una corrida completa de tu crédito con ese abono.",
        {size: 8.5, color: TENUE, max: ANCHO}) + 16;

    y = seccion(p2, y, "Lo que cuesta esperar");
    p2.caja(MARGEN, y - 12, ANCHO, 58, CREMA);
    y = parrafoRico(p2, MARGEN + 12, y, d.esperar, {size: 10, color: TINTA, max: ANCHO - 24}) + 26;

    y = seccion(p2, y, "Qué sí puedes hacer");
    y = vinetas(p2, y, d.acciones);

    pie(p2, "Habítalo Orienta · Proyección con supuestos, no una cotización del Infonavit.", 2, DE);

    /* ---------- 3. cómo comprobar: pagos, predicción e insumos ---------- */
    var p3 = new Pagina();
    encabezado(p3, "Cómo comprobar estos números", FOL, d.fecha);

    y = 116;
    y = seccion(p3, y, "Tus siguientes pagos " + d.frecuencia + ", uno por uno");
    y = tabla(p3, y, [["Pago", 9, "left"], ["Fecha", 18, "left"], ["Días", 9, "right"],
                      ["Entra", 19, "right"], ["Comisiones", 16, "right"],
                      ["Intereses", 17, "right"], ["A capital", 16, "right"], ["Saldo", 20, "right"]],
              d.primeros.slice(0, 6), {alto: 13.5, size: 8});
    y = p3.parrafo(MARGEN, y, d.aclaraFrec + " Cada pago se aplica en este orden: primero comisiones, " +
        "luego intereses, y lo que sobra baja tu deuda. Los días se cuentan con base 30/360.",
        {size: 8.5, color: TENUE, max: ANCHO}) + 14;

    y = seccion(p3, y, "Compruébalo contra tu próximo estado de cuenta");
    p3.caja(MARGEN, y - 12, ANCHO, 50, CREMA);
    y = parrafoRico(p3, MARGEN + 12, y, d.prediccion, {size: 9.5, color: TINTA, max: ANCHO - 24}) + 24;

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
    encabezado(p4, "Lo que tienes que tomar en cuenta", FOL, d.fecha);

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
