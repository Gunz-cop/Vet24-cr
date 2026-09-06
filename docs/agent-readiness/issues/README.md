# Issues de ejecución

Los cuerpos locales son la fuente publicada en GitHub y se mantienen sincronizados. Su aceptación se copia literalmente de README; el estado de ejecución se consulta en GitHub.

| Subfase | Cuerpo | GitHub | Entrada |
|---|---|---|---|
| AR1 — Política de rastreo | [ar1.md](ar1.md) | [#12](https://github.com/Gunz-cop/Vet24-cr/issues/12) | D1 aprobada el 2026-09-05; PR #11 fusionado |
| AR2 — Catálogo público y descubrimiento | [ar2.md](ar2.md) | [#13](https://github.com/Gunz-cop/Vet24-cr/issues/13) | AR1 fusionada y verificada |
| AR3 — Markdown y validación de agentes | [ar3.md](ar3.md) | [#15](https://github.com/Gunz-cop/Vet24-cr/issues/15) | AR2 fusionada y verificada |

No se crean issues ejecutables para capas 4/5 ni DNS-AID sin decisión del negocio. El issue #5 existente conserva su propio alcance.

Los enlaces de contrato apuntan a la rama documental docs/agent-readiness-spec porque esta tarea no abre PR ni integra a main. La sesión ejecutora debe leer esa rama aunque empiece su código desde main. No borrar la rama documental mientras los issues dependan de esos enlaces.
