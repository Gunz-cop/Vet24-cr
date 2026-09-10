# Preflight de localización y teléfonos — documentación editorial

Fecha: **2026-09-09**  
Base: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Estado: **PASS documental; no es PASS de candidato HTML/assets**

## Comando reproducible

Se ejecutó desde la raíz del worktree:

```powershell
$files=Get-ChildItem -File 'docs/blog/editorial/urgencias-en-perros'
$all=($files | ForEach-Object { Get-Content -Raw $_.FullName }) -join "`n"
$phone='(?<!\d)(?:\+?1[ -.]?)?(?:\(?\d{3}\)?[ .-])\d{3}[ .-]\d{4}(?!\d)'
if($all -match $phone){ throw 'Se detectó posible teléfono norteamericano en documentos editoriales' }
```

## Superficie y resultado

| Superficie | Estado | Resultado |
|---|---|---|
| Todos los Markdown actuales dentro de `docs/blog/editorial/urgencias-en-perros/` | Escaneada | `US_PHONE_CHECK=PASS` |
| Citas/URLs escritas en esos Markdown | Incluidas indirectamente en el mismo texto | Sin coincidencia telefónica |
| Artículo candidato reescrito | No existe en esta fase | No verificado |
| HTML renderizado `dist/client`/`dist/server` | No generado; no se ejecutó build | No verificado |
| `title`, meta description, Open Graph, JSON-LD | No existe candidato nuevo | No verificado |
| Alt text, texto incrustado en imágenes y assets | No existen assets de esta fase | No verificado |

El patrón solo detecta formatos telefónicos; no demuestra que una frase extranjera no contenga una instrucción operativa sin número. La auditoría posterior debe revisar también texto semántico y metadatos.

## Regla para el candidato futuro

Tras redactar/renderizar, escanear por separado Markdown fuente, HTML cliente/servidor, JSON-LD, metadatos, citas, etiquetas/alt text y cualquier texto de imagen. Debe quedar registrado el comando, los archivos, la fecha y el código de salida. Cualquier teléfono, precio, disponibilidad o instrucción operativa de APCC/Poison Control de EE. UU. bloquea el candidato; la acción local debe apuntar a una clínica/local veterinarian verificable o declarar que no se encontró una línea nacional verificable.
