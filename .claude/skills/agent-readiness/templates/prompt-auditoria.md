# Prompt de auditoría cruzada

Pegar en una conversación **nueva** de cada IA, sin contexto previo del
proyecto, con el sitio ya en producción. Sustituir `<DOMINIO>` y el ejemplo de
ficha.

Está escrito para forzar tres cosas que, sin pedirlas, no ocurren: que ejecute
pruebas de verdad en vez de teorizar, que separe lo comprobado de lo inferido, y
que distinga accesibilidad de citación. Sin esa última separación, la respuesta
degenera en consejos de SEO.

---

```
Quiero una auditoría técnica de https://<DOMINIO> desde TU punto de vista como
agente de IA: si tus sistemas de búsqueda y recuperación pueden encontrar,
recuperar, navegar e interpretar este sitio.

No quiero una revisión SEO teórica. Quiero que ejecutes pruebas reales con las
herramientas que tengas disponibles y me reportes lo que observaste.

Estructura la respuesta en estos diez puntos:

1. ACCESO. ¿Puedes acceder al dominio? ¿Qué código de respuesta obtienes?
   ¿Encuentras bloqueos, challenges o 403? Dime con qué mecanismo accediste y,
   si lo sabes, con qué User-Agent. Si no puedes saberlo, dilo explícitamente.

2. ROBOTS.TXT. Recupéralo. ¿Qué crawlers permite? ¿Está permitido el tuyo?
   Cita las reglas literalmente.

3. SITEMAP. Pruébalo. ¿Existe? ¿Es válido? ¿Cuántas URLs tiene?

4. HTML INICIAL. Recupera la portada y una página interna. ¿El contenido
   principal está en el HTML o depende de JavaScript? Cítame lo que recuperas.

5. ENLAZADO. Navega portada → categoría → página de detalle siguiendo enlaces
   HTML. ¿Funciona? ¿Detectas páginas huérfanas?

6. DATOS ESTRUCTURADOS. ¿Encuentras JSON-LD? ¿De qué tipos? Si tu herramienta
   no puede ver el HTML bruto, dilo en vez de concluir que no existe.

7. PRUEBA CIEGA DE UNA PÁGINA. Toma https://<DOMINIO>/<EJEMPLO> y dime,
   basándote SOLO en lo que recuperaste de ahí: qué es, qué hace, cuál es su
   fuente oficial, y qué elementos de la página te permitieron concluirlo.

8. TU PROPIO ECOSISTEMA. Separa explícitamente en cuatro bloques: (a) lo que
   comprobaste con pruebas en esta conversación, (b) lo que sabes por
   documentación oficial de tu plataforma, (c) lo que estás infiriendo, (d) lo
   que NO puedes comprobar desde tu entorno.

9. DIAGNÓSTICO. Clasifica cada hallazgo como CRÍTICO, ALTO, MEDIO, BAJO o
   CORRECTO. Si algo no lo pudiste verificar, márcalo como NO VERIFICABLE en
   lugar de suponer que está mal.

10. RECOMENDACIONES. Por cada problema: la evidencia concreta, la URL afectada,
    por qué es un problema, el cambio recomendado y cómo verificar que
    funcionó.

Y termina respondiendo a esto:

Si un usuario de tu plataforma pregunta por algo que este sitio cubre, ¿hay
algún impedimento técnico OBSERVABLE que dificulte que tus sistemas lo
encuentren, lo recuperen o lo comprendan?

Distingue esa respuesta de la otra pregunta, que es distinta: si vas a citarlo.
La segunda depende de ranking y autoridad, no de accesibilidad. No las mezcles.

Importante: no inventes limitaciones ni capacidades de tu plataforma. Si no
puedes comprobar algo, dilo.
```

---

## Después

Verificá **cada** hallazgo con `curl` antes de tocar código. Ver
`../references/auditoria-cruzada.md`: en la ronda de FuenteAI, tres de cinco IAs
reportaron fallos que no existían.
