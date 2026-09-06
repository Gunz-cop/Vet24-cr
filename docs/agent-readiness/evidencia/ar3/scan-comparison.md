# AR3 — comparativa del escaneo

La comparación usa [scan-pre-deploy.json](scan-pre-deploy.json) y
[scan-post-deploy.json](scan-post-deploy.json). El único cambio de estado
entre ambos escaneos es:

```text
markdownNegotiation: fail -> pass
```

## Checks no pasados o informativos

Estos resultados no son regresiones introducidas por AR3:

- `dnsAid=fail`: decisión de DNS-AID no autorizada en esta fase; no se publica
  ningún endpoint ni registro adicional.
- `authMd=fail`: limitación aceptada de AR2/D7; el sitio no ofrece registro de
  agentes ni OAuth ficticio.
- `oauthDiscovery=fail` y `oauthProtectedResource=fail`: fuera de alcance.
- `mcpServerCard=fail`, `a2aAgentCard=fail`, `agentSkills=fail`, `webMcp=fail` y
  `ard=fail`: capas de descubrimiento/protocolo fuera de alcance; no se
  inventan endpoints.
- `webBotAuth=neutral`: no es un criterio funcional fallido; el directorio es
  informativo.
- `x402=neutral`, `mpp=neutral`, `ucp=neutral`, `acp=neutral` y `ap2=neutral`:
  protocolos comerciales no aplicables al directorio.

Las capas superiores 4/5 y DNS-AID quedan expresamente como decisiones no
autorizadas. El escaneo se conserva íntegro para que esas decisiones no se
confundan con una certificación.

