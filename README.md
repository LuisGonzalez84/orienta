# Habítalo Orienta — versión de prueba

Diagnóstico gratuito del crédito Infonavit. El estado de cuenta se lee
**dentro del navegador de quien lo sube**: no se envía a ningún servidor,
no hay base de datos y no se guarda nada.

Esta copia es para una prueba con voluntarios. No está indexada por
buscadores (`noindex`) y lleva un bloque para que quien la pruebe mande
sus comentarios.

---

## Antes de subirla: pon tu WhatsApp

Sin esto, el botón de comentarios manda un correo en vez de un WhatsApp.

1. Abre `index.html`.
2. Busca la línea que dice `var WHATSAPP = "";` (está casi al final).
3. Escribe entre las comillas tu número con lada, **solo números**:
   `52` y luego tus 10 dígitos. Por ejemplo:

   ```js
   var WHATSAPP = "529981234567";
   ```

Nada más. Si lo dejas vacío igual funciona, pero por correo.

---

## Publicarla gratis en GitHub Pages

Diez minutos, todo desde la página de GitHub. No necesitas instalar nada
ni escribir un solo comando.

**1. Crea el repositorio**

En github.com, arriba a la derecha, el botón **+** → **New repository**.

- **Repository name:** `orienta`
- **Public** (tiene que ser público para que Pages funcione gratis)
- No marques nada de "Add a README"
- **Create repository**

**2. Sube los archivos**

En la pantalla que aparece, haz clic en **uploading an existing file**
(o ve a **Add file** → **Upload files**).

Arrastra estos tres archivos, **los tres juntos**:

```
index.html
pdfgen.js
.nojekyll
```

Abajo, en **Commit changes**, escribe "primera versión" y dale al botón
verde.

> Si `.nojekyll` no aparece al arrastrar, es porque tu computadora
> esconde los archivos que empiezan con punto. En Mac presiona
> `Cmd + Shift + .` en la ventana de archivos para verlo; en Windows,
> en el Explorador, pestaña *Vista* → *Elementos ocultos*.
> Si de plano no lo logras, no pasa nada: la página funciona igual.

**3. Enciende GitHub Pages**

Dentro del repositorio: **Settings** (arriba) → en la columna izquierda,
**Pages**.

- **Source:** *Deploy from a branch*
- **Branch:** `main` y la carpeta `/ (root)`
- **Save**

**4. Espera un minuto y abre tu liga**

Vuelve a recargar esa misma pantalla de *Pages*. Aparecerá arriba:

```
https://TU-USUARIO.github.io/orienta/
```

Ésa es la liga que les mandas a tus voluntarios. Ya trae candado
(HTTPS), así que el lector de PDF funciona sin problema.

---

## Para cambiar algo después

En GitHub, entra al archivo, haz clic en el **lápiz** (arriba a la
derecha), edita y dale a **Commit changes**. La página se actualiza
sola en menos de un minuto.

Si no ves el cambio, es la caché del navegador: recarga con
`Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac).

---

## Cómo comprobar que quedó bien

Desde el celular, en orden:

1. Abre la liga. Debe cargar **en blanco**: sin números, sin datos de nadie.
2. Sube un estado de cuenta. Si aparecen los saldos y dice cuántos
   movimientos leyó, la parte difícil está funcionando.
3. Marca la casilla del aviso y confirma que sale el botón de pago.
4. Desbloquea y descarga el PDF. Debe bajar solo, sin mensajes raros.
5. Ponte en **modo avión** y vuelve a subir el documento. Debe funcionar
   igual — porque nada se envía.
6. Dale al botón de comentarios: debe abrirte tu WhatsApp con el mensaje
   ya escrito.

---

## Qué le dices a tus voluntarios

> Estoy probando una herramienta que lee tu estado de cuenta del Infonavit
> y te dice en un minuto cuánto te falta de verdad, cuánto vas a pagar de
> intereses y en qué fecha terminas.
>
> Tu documento **no sale de tu teléfono**: se lee ahí mismo. Si quieres
> comprobarlo, ponte en modo avión y verás que funciona igual.
>
> Lo que más me sirve es que me digas qué **no** funcionó o qué no se
> entendió. Hay un botón al final para escribirme.

---

## Aviso

Es una proyección con supuestos, no una cotización del Infonavit ni
asesoría legal o fiscal. No es una página del Infonavit.

Responsable del tratamiento de datos: Alejandro Rodríguez Aznar, quien
opera como Habítalo México, Cancún, Quintana Roo ·
contacto@habitalo.com.mx
