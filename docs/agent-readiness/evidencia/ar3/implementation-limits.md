# AR3 — límites de esta sesión ejecutora

Esta sesión implementa y prueba localmente la capa AR3. No fusiona, despliega,
certifica producción ni cierra el issue #15.

- El escaneo completo previo se archivó en `scan-pre-deploy.json`; repetirlo
  desde este entorno falló por `EACCES` de red contra
  `isitagentready.com`.
- El build compiló el Worker, pero Astro/Cloudflare no pudo completar el
  prerender local porque el sandbox bloqueó la escritura de
  `C:\Users\grcx1\.wrangler\registry\prerender`.
- La modalidad `--base-url` del verificador y la auditoría de tres IAs quedan
  para la sesión verificadora posterior, con acceso de red real al dominio.
- No se simulan respuestas productivas, resultados de escaneo posteriores ni
  respuestas de IAs.
