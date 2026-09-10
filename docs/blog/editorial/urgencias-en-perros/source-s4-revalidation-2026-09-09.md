# Revalidación S4 — Merck `General Treatment of Poisoning`

Fecha de consulta: **2026-09-09**  
URL: https://www.merckvetmanual.com/special-pet-topics/poisoning/general-treatment-of-poisoning  
Base local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`

## Comando y resultado

Consulta directa con `Invoke-WebRequest -UseBasicParsing`; no se modificó ningún archivo del proyecto.

```text
STATUS=200
CONTENT_TYPE=text/html; charset=utf-8
BYTES=223675
TITLE=General Treatment of Poisoning - Special Pet Topics - Merck Veterinary Manual
HAS_FULL_REVIEW_OCT_2020=True
HAS_LAST_UPDATED_SEPT_2024=True
HAS_VOMITING_MAY_BE_INDUCED=True
HAS_NOT_RECOMMENDED_CONDITIONS=True
HAS_US_PHONE=False
```

## Pasaje localizado

- La página identifica `Full Review: Oct 2020` y `Last updated: Sept 2024`.
- En el cuerpo para propietarios, Merck indica que en algunos casos de ingestión puede considerarse inducir el vómito.
- La misma sección enumera contextos en los que no se recomienda, como sustancias que dañan el estómago/esófago, transcurso de horas, reflejo deglutorio ausente, convulsiones o riesgo de aspiración.

## Uso contractual

Resultado: **S4 revalidada para apoyar C5 con matiz, no una prohibición absoluta**.

La redacción futura debe combinar S4 con S5/ASPCA y limitarse a: «No intentés inducir el vómito ni dar remedios por cuenta propia; consultá primero». S4 no respalda teléfonos, precios, disponibilidad, hotline extranjera ni una instrucción individualizada.

La comprobación `HAS_US_PHONE=False` se refiere solo al HTML S4 actual. La auditoría final debe repetir el control sobre el candidato completo y sobre S5/S6, citas, imágenes, alt text y metadatos; S5/S6 contienen datos estadounidenses que deben excluirse.

## Estado

S4 deja de ser un bloqueo de disponibilidad de URL, pero C5 continúa bloqueada para publicación hasta que una auditoría independiente confirme la formulación, la pareja S4+S5, el alcance local y la ausencia de teléfonos/precios/operativa extranjera.
