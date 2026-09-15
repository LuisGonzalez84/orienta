/* Generador de PDF sin dependencias — Diagnóstico Habítalo Orienta.
   Emite un PDF 1.4 con Helvetica/Helvetica-Bold y WinAnsiEncoding.
   El mismo código corre en el navegador (no sale nada del dispositivo). */

(function(root, factory){
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.OrientaPDF = factory();
})(typeof self !== "undefined" ? self : this, function(){
  "use strict";

  var W = 612, H = 792;                       // carta, en puntos
  var MARGEN = 54;
  var ANCHO = W - MARGEN * 2;

  /* --- WinAnsiEncoding: latin-1 salvo el tramo 0x80-0x9F --- */
  var WIN = {"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,
             "Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,
             "–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
  function esc(s){
    var out = "";
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
    if (o.align === "right") x -= ancho(s, size, bold);
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

  /* ================= el documento ================= */
  var NAVY = [0.106, 0.180, 0.310], ORO = [0.604, 0.439, 0.121],
      TINTA = [0.078, 0.141, 0.247], SUAVE = [0.329, 0.380, 0.478],
      TENUE = [0.541, 0.584, 0.659], CREMA = [0.973, 0.945, 0.871];

  function encabezado(p, titulo, folio, fecha){
    p.caja(0, 0, W, 84, NAVY);
    p.texto(MARGEN, 36, "HABÍTALO ORIENTA", {size: 16, bold: true, color: [0.95, 0.96, 0.98]});
    p.texto(MARGEN, 56, titulo, {size: 10.5, color: [0.74, 0.79, 0.86]});
    p.texto(W - MARGEN, 36, folio, {size: 9, align: "right", color: [0.86, 0.67, 0.29]});
    p.texto(W - MARGEN, 52, fecha, {size: 9, align: "right", color: [0.74, 0.79, 0.86]});
  }

  function seccion(p, y, titulo){
    p.texto(MARGEN, y, titulo.toUpperCase(), {size: 9, bold: true, color: ORO});
    p.linea(MARGEN, y + 7, W - MARGEN, y + 7, [0.84, 0.80, 0.70]);
    return y + 24;
  }

  function dato(p, y, etiqueta, valor, nota){
    p.texto(MARGEN, y, valor, {size: 19, bold: true, color: TINTA});
    p.texto(MARGEN + 190, y - 6, etiqueta, {size: 10, color: SUAVE});
    if (nota) p.texto(MARGEN + 190, y + 8, nota, {size: 8.5, color: TENUE});
    return y + 34;
  }

  function fila(p, y, etiqueta, valor){
    p.texto(MARGEN, y, etiqueta, {size: 9.5, color: SUAVE});
    p.texto(W - MARGEN, y, valor, {size: 9.5, bold: true, align: "right", color: TINTA});
    p.linea(MARGEN, y + 5, W - MARGEN, y + 5, [0.92, 0.93, 0.95], 0.5);
    return y + 17;
  }

  function vinetas(p, y, items, size){
    size = size || 9.5;
    for (var i = 0; i < items.length; i++){
      p.texto(MARGEN + 4, y, "•", {size: size, color: ORO});
      y = p.parrafo(MARGEN + 16, y, items[i], {size: size, color: SUAVE, max: ANCHO - 16, alto: size * 1.4}) + 6;
    }
    return y;
  }

  /** d: {folio, fecha, pagos, anios, fechaFin, costo, patronal, abono, abonoFin,
          abonoMenos, abonoAhorro, capturado:[[k,v]], deducido:[[k,v]], avisoVersion, consentido} */
  function diagnostico(d){
    var p1 = new Pagina(), y;

    encabezado(p1, "Diagnóstico de tu crédito Infonavit", d.folio, d.fecha);

    y = 122;
    y = seccion(p1, y, "Así vas hoy, sin cambiar nada");
    y = dato(p1, y, "pagos te faltan", String(d.pagos), "son unos " + d.anios + " años más");
    y = dato(p1, y, "terminarías de pagar", d.fechaFin, "solo con tu descuento actual");
    y = dato(p1, y, "pagarías de intereses, seguros y cuotas", d.costo, "en todo lo que te falta");
    y = dato(p1, y, "pone tu patrón cada mes", d.patronal, "además de tu descuento de nómina");

    y += 10;
    p1.caja(MARGEN, y - 14, ANCHO, 74, CREMA);
    y = seccion(p1, y, "Si abonas " + d.abono + " cada mes");
    y = p1.parrafo(MARGEN, y, "Acabarías en " + d.abonoFin + ": son " + d.abonoMenos +
        " pagos menos y dejarías de pagar " + d.abonoAhorro + " de intereses y cargos.",
        {size: 11, color: TINTA, max: ANCHO - 10}) + 18;

    y = seccion(p1, y, "De dónde salen estos números");
    p1.texto(MARGEN, y - 8, "Lo que dice tu estado de cuenta", {size: 8.5, bold: true, color: TENUE});
    y += 8;
    for (var i = 0; i < d.capturado.length; i++) y = fila(p1, y, d.capturado[i][0], d.capturado[i][1]);
    y += 8;
    p1.texto(MARGEN, y, "Lo que dedujimos de tus movimientos", {size: 8.5, bold: true, color: TENUE});
    y += 16;
    for (i = 0; i < d.deducido.length; i++) y = fila(p1, y, d.deducido[i][0], d.deducido[i][1]);

    p1.texto(MARGEN, H - 34, "Habítalo Orienta · No es una institución financiera ni está afiliada al Infonavit.",
             {size: 8, color: TENUE});
    p1.texto(W - MARGEN, H - 34, "Página 1 de 2", {size: 8, align: "right", color: TENUE});

    var p2 = new Pagina();
    encabezado(p2, "Lo que tienes que tomar en cuenta", d.folio, d.fecha);

    y = 122;
    y = seccion(p2, y, "Antes de decidir");
    y = vinetas(p2, y, [
      "Esto es una proyección, no una cotización del Infonavit. Para liquidar, refinanciar o cualquier trámite, la cifra que manda es la que el Infonavit te dé por escrito.",
      "Supone que tu descuento de nómina sigue igual y que conservas tu relación laboral. Si pierdes el empleo o cambia tu salario, los números cambian.",
      "Supone que tus pagos se siguen aplicando con la misma frecuencia que hasta hoy.",
      "El seguro de daños y la cuota de administración se actualizan de vez en cuando; aquí se proyectan con el valor de hoy.",
      "Al hacer un abono, pide expresamente que se aplique a capital. Si no lo pides, puede aplicarse de otra forma y el efecto no será el de esta proyección.",
      "El abono no baja tu descuento mensual: lo que hace es acortar el plazo."
    ]);

    y += 10;
    y = seccion(p2, y, "Lo que este documento no es");
    y = vinetas(p2, y, [
      "No es asesoría legal ni fiscal. Si tu caso toca sucesión, copropiedad, litigio, escrituración o impuestos, eso lo ve un especialista aliado.",
      "No es asesoría de inversión ni una recomendación de contratar ningún producto financiero.",
      "No es un estado de cuenta ni un documento emitido por el Infonavit."
    ]);

    y += 14;
    p2.caja(MARGEN, y - 12, ANCHO, 52, [0.96, 0.97, 0.98]);
    y = p2.parrafo(MARGEN + 12, y, "Tus datos no se guardaron. Tu estado de cuenta se leyó dentro de tu " +
        "dispositivo y este documento se armó ahí mismo: tu nombre, NSS, RFC, CURP y domicilio nunca " +
        "salieron de tu equipo.", {size: 9.5, color: SUAVE, max: ANCHO - 24});

    y += 26;
    y = seccion(p2, y, "Constancia");
    y = fila(p2, y, "Folio", d.folio);
    y = fila(p2, y, "Fecha de emisión", d.fecha);
    y = fila(p2, y, "Versión del aviso de privacidad", d.avisoVersion);
    y = fila(p2, y, "Consentimiento registrado", d.consentido);

    p2.texto(MARGEN, H - 34, "Habítalo Orienta · Cancún, Quintana Roo", {size: 8, color: TENUE});
    p2.texto(W - MARGEN, H - 34, "Página 2 de 2", {size: 8, align: "right", color: TENUE});

    return construir([p1, p2]);
  }

  return {diagnostico: diagnostico, construir: construir, Pagina: Pagina};
});
