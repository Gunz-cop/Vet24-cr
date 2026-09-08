# B3 — Corrección 2: registro de autoría y tipo de entidad

Ejecutada por la **sesión coordinadora**, con autorización explícita del usuario del
2026-09-07, ante la indisponibilidad de la sesión ejecutora. Se hace constar la
excepción al reparto de roles: quien escribió este cambio no puede auditarlo. La
verificación independiente de B3 sigue pendiente y ahora cubre también este delta.

Base: `bdf6312d6a8a5bae46ddcd6aae9f4abf6edbe51c`
Plan vigente: `main` en `aab689eacc13524a3395289e53c0dd9aacf034c5` (enmienda de autoría)

## Qué se cambió

| Archivo | Cambio |
|---|---|
| `docs/blog/autoria.md` | Registro real: firma colectiva, tipo `Organization`, aprobación del titular con fecha, alcance del seed, `revisadoPor` omitido con motivo. Sin nombres personales. |
| `src/layouts/BlogLayout.astro` | `author` pasa de `Person` a `Organization`. |
| `scripts/verification/blog.mjs` | Verifica contra el registro el **nombre y el tipo** del autor emitido. |

No se tocaron el catálogo de enlaces, el footer, el condicional de navegación, la
política editorial ni el frontmatter del piloto.

## El defecto corregido

`BlogLayout.astro:24` emitía `author: { '@type': 'Person', name: autor }` con
`autor: "Equipo editorial Vet24 Costa Rica"`. Al publicarse un artículo, el sitio
habría afirmado en datos estructurados que existe una persona con ese nombre. Nada
llegó a producción: la rama nunca se fusionó.

## Comprobaciones

```
npm run check                          EXIT=0   (0 errores, 75 hints)
npm test                               EXIT=0   (77 pass, 0 fail, 0 skip)
npm run build:no-shorten               EXIT=0
node scripts/verification/blog.mjs     EXIT=1   sólo PREVIEW_UNAVAILABLE (sin preview en el entorno)
node scripts/verification/agent-markdown.mjs   EXIT=0   127 mirrors
node scripts/verification/agent-catalog.mjs    EXIT=0   112 clínicas, 112 rutas
```

### JSON-LD con fixture publicada

```json
"author": {"@type": "Organization", "name": "Equipo editorial Vet24 Costa Rica"}
```

Sin fallos de autoría en `blog.mjs` con la fixture publicada.

### Mutaciones — el control falla cuando debe

```
Person en vez de Organization:
- tipo de autor JSON-LD no coincide con el registro:
  /blog/guias-por-especie/urgencias-en-perros/; declarado: Organization; emitido: Person

Firma no aprobada ("Dra. Inventada"):
- firma no aprobada en el registro:
  /blog/guias-por-especie/urgencias-en-perros/; declarada: Equipo editorial Vet24 Costa Rica;
  usada: Dra. Inventada
```

Ambas mutaciones y la fixture se revirtieron. El piloto vuelve a `estado: "borrador"`
sin `datePublished`, y el build final lo confirma ausente de `dist/client`.

## Discrepancia declarada

El titular expresó la firma como «Equipo de Vet24cr». La que se publica es
«Equipo editorial Vet24 Costa Rica», que es la que ya llevan los artículos y coincide
con el nombre del sitio; ambas designan al mismo colectivo. No se modificó el
frontmatter del piloto porque es propiedad de B4, no de B3. Si el titular prefiere la
forma corta, B4 la alinea y el control de `blog.mjs` lo exigirá automáticamente.

## No verificado

- `blog.mjs` en código 0: requiere preview, que no arranca en este entorno. Sólo se
  demostró que el único fallo restante es `PREVIEW_UNAVAILABLE`.
- E2E completo: no se ejecutó en esta corrección.
- Nada de esto está fusionado ni desplegado.
