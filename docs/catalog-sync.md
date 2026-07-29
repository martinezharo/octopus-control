# Sincronización del catálogo con Fewya

Esta web es un **espejo de solo lectura** de la tienda `octopus-control` en Fewya.
Fewya es la fuente de la verdad para el contenido (título, descripción, imágenes,
precio, stock, si está activo). Esta web es la fuente de la verdad para **las URLs**.

Esa división es lo único que importa recordar: si alguna vez hay que elegir entre
respetar Fewya y conservar una URL, **gana la URL**.

## Por qué

Antes esta web servía un JSON congelado (`src/data/productos.json`) que había que
editar a mano. Se quedaba desfasado y, cuando un producto desaparecía, su URL
desaparecía con él. En la migración de abril de 2026 dieciséis fichas se
redirigieron con 301 a `/products/`, cosa que Google interpreta como *soft 404*:
esas URLs no traspasaron su autoridad, la perdieron.

## Cómo funciona

```
Fewya  ──GET /api/public/shops/octopus-control/catalog.json──▶  build de Astro
                                                                    │
   src/data/productos.json      (instantánea: URLs + campos propios) │
   src/data/catalog-registry.json (pins manuales + URLs retiradas)  ─┤
   src/data/fewya-catalog.json  (última copia buena, opcional)      ─┘
                                                                    ▼
                                                         páginas estáticas
```

En cada build:

1. Se pide el feed público a Fewya (no hace falta ninguna credencial: solo expone
   lo que ya es visible en las fichas públicas, y **no publica el stock exacto**,
   solo si hay o no).
2. Cada producto local se empareja con su equivalente en Fewya
   (`src/lib/catalog/matching.ts`).
3. Se genera una página por cada URL conocida, con su estado de disponibilidad.

### Si el feed falla

El build **nunca falla** por esto. Va cayendo en cascada:

| Situación | Qué pasa |
|---|---|
| Feed accesible | Espejo completo, precios y stock al día |
| Feed caído, hay caché commiteada | Se usa la caché (aviso en el log) |
| Ni feed ni caché | Se usa la instantánea: las URLs siguen vivas, el stock no se sincroniza |

Un feed que devuelve **cero productos se trata como un fallo**: un mal despliegue
en Fewya no puede dejar esta web sin catálogo.

## Los cuatro estados

| Estado | Cuándo | Qué se ve | schema.org |
|---|---|---|---|
| `in_stock` | En Fewya, con unidades | Botón de compra al producto exacto | `InStock` |
| `out_of_stock` | En Fewya, sin unidades | Ficha viva, sin botón, alternativas | `OutOfStock` |
| `unlisted` | Desapareció del feed | Ficha viva con el contenido antiguo | `OutOfStock` |
| `archived` | Retirado a propósito (registro) | Ficha viva marcada como descatalogada | `Discontinued` |

Los cuatro devuelven **200 y son indexables**. Ninguno redirige al listado.

## Emparejamiento de slugs

Los dos catálogos no comparten convención. Aquí conviven `lg-akb75675304`,
`mando-lg-akb74915324` y `mando-akb69680403-lg`; Fewya genera el slug desde el
título. Por eso el emparejamiento no compara slugs, sino:

1. **Pin manual** del registro (siempre gana).
2. **Slug idéntico**.
3. **Código de modelo**, normalizando la separación (`bn59-01358d` = `bn5901358d`)
   e ignorando el orden de las palabras.
4. **Firma de tokens del título**, para productos sin código (`Mando para Chromecast`).

Reglas de seguridad, en orden de importancia:

- Un mando nunca se empareja con una funda.
- Dos colores distintos del mismo modelo nunca se emparejan entre sí.
- Dos modelos que solo comparten el prefijo de familia (`AA59-00602A` y
  `AA59-00582A`) **no** se emparejan.
- Ante dos candidatos igual de plausibles, **no se elige ninguno**.

Preferimos dejar un producto sin emparejar a emparejarlo mal: sin pareja pierde el
botón de compra y sale avisado en el log; mal emparejado enseña el precio y las
fotos de otro producto y manda al comprador a la ficha equivocada.

## Operativa

### Un producto se quedó sin pareja

El build lo dice:

```
[catalog] 2 product(s) have no Fewya counterpart and lost their buy button.
  - lg-mr15-20-funda-azul-lum (Funda LG MR15-20 Azul Luminiscente)
```

Si es un error, fíjalo a mano en `src/data/catalog-registry.json`:

```json
"overrides": {
  "lg-mr15-20-funda-azul-lum": "funda-lg-mr15-20-azul-luminiscente"
}
```

### Dejar de vender un modelo

1. Desactívalo o bórralo en Fewya.
2. Añádelo a `retired` en `src/data/catalog-registry.json`, con su slug **exacto**.

La URL sigue publicada como descatalogada, enlazando a alternativas en stock.
**Nunca borres una entrada de `retired`** salvo para volver a venderlo.

### Volver a vender un modelo retirado

Súbelo a Fewya y quita su entrada de `retired`. El emparejamiento automático lo
reactiva sobre **la misma URL de siempre**, con su historial intacto.

Si el slug que genera Fewya no se parece al que teníamos aquí, añade un pin en
`overrides`. Lo que jamás hay que hacer es crear una URL nueva para un producto
que ya tuvo la suya.

### Refrescar la caché

```bash
pnpm sync:catalog   # escribe src/data/fewya-catalog.json
pnpm build          # informa de emparejamientos y huérfanos
```

`git diff` sobre la caché enseña qué ha cambiado en la tienda antes de desplegar.

### Que se actualice solo

El build ya pide el feed en vivo, así que basta con lanzar un build periódico.
En Cloudflare Pages: crea un *Deploy Hook* y llámalo desde un cron (o desde Fewya
cuando cambie el catálogo). No hace falta commit para que se actualicen precios y
stock.

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `FEWYA_BASE_URL` | `https://fewya.com` | Origen del feed |
| `FEWYA_SHOP_SLUG` | `octopus-control` | Tienda a replicar |

Ninguna es obligatoria: producción funciona sin `.env`.

## Tests

```bash
pnpm test
```

`tests/matching.test.ts` comprueba **los 37 slugs reales** contra un catálogo de
Fewya simulado: que todos encuentren pareja y que ninguno encuentre la equivocada.
Si tocas el matcher y esos tests fallan, el fallo es del matcher.
