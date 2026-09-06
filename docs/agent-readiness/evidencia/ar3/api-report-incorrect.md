# AR3 — conservación de `/api/report-incorrect/`

Fecha: 2026-09-06. Probe ejecutado contra producción:

```text
curl.exe -sS -D - -o NUL -X POST https://vet24cr.com/api/report-incorrect/ -H "Content-Type: application/json" --data '{"slug":"__ar3_probe__","reason":"verification"}'
```

Resultado observado: `HTTP/1.1 200 OK`, `Content-Type: application/json`,
`Content-Length: 114`. La ruta sigue siendo atendida por su endpoint previo;
el nuevo routing solo incluye las familias HTML contractuales y no consume
este POST.

El cuerpo se descartó deliberadamente con `-o NUL`, por lo que no se presenta
un cuerpo inventado como evidencia.

