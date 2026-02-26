---
description: despliegue de la aplicación a Cloudflare Pages
---
# Despliegue a Cloudflare Pages

Sigue estos pasos para desplegar la última versión de la web:

1. Asegúrate de que tienes todos los cambios guardados.
// turbo
2. Ejecuta el comando de despliegue:
```bash
pnpm deploy
```

Este comando realizará las siguientes acciones automáticamente:
- Construirá el proyecto (`pnpm build`).
- Desplegará el contenido de la carpeta `dist/` a tu proyecto `octopus-control-astro` en Cloudflare.
