# Organizador Académico Desktop

Aplicación de escritorio para Windows con interfaz HTML/CSS/JavaScript, Tauri y SQLite local. No necesita cuenta, servidor remoto ni conexión a Internet durante el uso normal.

## Funciones incluidas

- Asignaturas y temas, con edición y eliminación.
- Notas con título y contenido.
- Registro de documentos e imágenes mediante rutas a los archivos originales.
- Registro de vídeos y enlaces web.
- Apertura de archivos con la aplicación predeterminada de Windows y apertura de URLs.
- Copia de seguridad de la base de datos SQLite.
- Interfaz glassmorphism con buscador y pestañas por tipo de contenido.

## Requisitos para compilar en Windows

1. Instala Node.js LTS.
2. Instala Rust estable desde https://www.rust-lang.org/tools/install.
3. Instala Microsoft C++ Build Tools y el Windows SDK. Consulta la guía de requisitos de Tauri para Windows: https://tauri.app/start/prerequisites/.
4. Abre PowerShell en esta carpeta y ejecuta:

```powershell
npm install
npm run dev
```

Para generar el instalador NSIS:

```powershell
npm run build
```

El instalador se genera bajo `src-tauri/target/release/bundle/nsis/`.

## Datos y privacidad

La base de datos se guarda en la carpeta de datos de la aplicación de Windows, dentro de `organizador.sqlite`. No se copian ni mueven documentos e imágenes; se almacenan sus rutas originales. Si se mueve un archivo, tendrás que actualizar su ruta editando el registro. Eliminar un registro no elimina el archivo del disco.

Las notas y los registros son completamente locales. Vídeos y enlaces que apunten a Internet solo podrán abrir su contenido si hay conexión; la aplicación no puede hacer que un sitio web remoto funcione offline.

## Copias de seguridad

Pulsa **Exportar copia** en la barra superior y selecciona dónde guardar la copia SQLite. Conserva una copia fuera del equipo si tus apuntes son importantes.

## Notas de desarrollo

Este proyecto crea una base de datos nueva con un esquema sencillo. Como los archivos originales enviados no incluían `app/database/db.py` ni la base de datos original, no se afirma que migre automáticamente los datos de la versión Python. La migración se podrá añadir cuando se conozca el esquema real anterior.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

Copyright (c) 2026 Daniel Collazo Aldana