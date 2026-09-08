# Registro de autoría editorial

Estado: **completo para el alcance de B3**.

Este archivo es la fuente de verdad de la atribución. `scripts/verification/blog.mjs`
lo lee y falla si el JSON-LD generado no coincide con lo declarado aquí, en **nombre
y en tipo**.

## Firma aprobada

- firma-publica: Equipo editorial Vet24 Costa Rica
- tipo-entidad: Organization
- aprobado-por: titular del sitio
- aprobado-el: 2026-09-07

El titular aprobó una **firma colectiva**, no personal. La expresó como «Equipo de
Vet24cr»; la forma que se publica es la de arriba, que es la que ya llevan los
artículos y coincide con el nombre del sitio. Ambas designan al mismo colectivo. Si
el titular prefiere la forma corta en el sitio, B4 alinea el frontmatter de los
artículos, que es su propiedad y no la de B3.

## Por qué `Organization` y no `Person`

Una firma colectiva debe declararse como `Organization`. Emitir `Person` con el
nombre de un equipo afirmaría en datos estructurados que existe una persona con ese
nombre — una declaración falsa leída por buscadores. El tipo se verifica igual que
el nombre.

## Sin nombres personales

Este registro no lleva nombres personales, correos ni documentos de identidad. El
repositorio es público: un nombre escrito aquí quedaría visible de forma permanente
y sobreviviría en el historial de git aunque después se borrara. Con una firma de
organización no existe ningún nodo `Person` que rellenar, así que ningún dato
personal es necesario para que la atribución sea veraz.

La responsabilidad editorial recae en el titular del sitio, identificable por la
titularidad del dominio y de la cuenta del repositorio. Una firma personal sigue
disponible como decisión del titular —es la señal E-E-A-T más fuerte para este
contenido— pero ninguna sesión puede exigirla.

## Revisión veterinaria

`revisadoPor` queda **omitido en todo el seed**. El titular confirmó el 2026-09-07
que no hay revisor veterinario profesional. Ninguna página puede insinuar lo
contrario, y la auditoría editorial de una sesión de IA no es revisión veterinaria.

Si en el futuro existe un revisor, hará falta credencial verificable y constancia de
revisión del texto concreto, artículo por artículo. Sin ambas se sigue omitiendo.

## Alcance

Aplica a los cinco artículos del seed de la fase 3:
`urgencias-en-perros`, `urgencias-en-gatos`, `atencion-veterinaria-para-exoticos`,
`costo-emergencia-veterinaria-nocturna`, `atencion-veterinaria-24h-por-zona`.

Ninguno está publicado todavía: el piloto sigue en `borrador` y los otros cuatro no
existen. La atribución se aplica al publicarse en B4.
