# Cómo restaurar Baifo

Cada domingo se guarda aquí una copia de Baifo.

| Carpeta | Qué hay |
| :--- | :--- |
| `Base de datos/` | Las últimas 12 copias de la base de datos, cifradas. El nombre lleva la fecha: `2026-11-08-baifo.dump.gpg` |
| `Imágenes/` | Las fotos de los anuncios. Cada archivo se llama como el final de su enlace en UploadThing |

La contraseña para abrir las copias está en el gestor de contraseñas, como **Baifo backup passphrase**. Sin ella, las copias no se pueden abrir.

## ¿Qué ha pasado?

- **Un despliegue ha roto la web:** en Vercel, abre *Deployments*, elige la versión anterior y pulsa *Instant Rollback*. No hace falta tocar nada de aquí.
- **Se han borrado o estropeado datos hace poco:** prueba primero a restaurar en Neon a un momento anterior (*Backup & Restore*). Pierdes menos datos que con la copia semanal.
- **Se ha perdido la base de datos o la cuenta de Neon:** sigue los pasos de abajo.

## Restaurar la base de datos

Necesitas Docker y un ordenador con `gpg`.

1. Descarga la copia más reciente de `Base de datos/` y descífrala. Te pedirá la contraseña:

   ```shell
   gpg --output baifo.dump --decrypt 2026-11-08-baifo.dump.gpg
   ```

2. Crea una base de datos **vacía** en Neon y copia su dirección directa, sin `-pooler`.

3. Restaura la copia:

   ```shell
   docker run --rm -i postgres:18-alpine pg_restore --no-owner --no-acl \
     --dbname="LA_DIRECCION_NUEVA" < baifo.dump
   ```

4. En Vercel, pon la dirección nueva en `DATABASE_URL` y `DATABASE_URL_UNPOOLED`, y vuelve a desplegar.

5. Abre baifo.es y comprueba que salen los anuncios, y que puedes entrar como administrador.

## Si se han perdido las imágenes

Mientras UploadThing siga en pie, las imágenes se ven solas y no hay nada que hacer. Si se pierden allí, hay que subir de nuevo los archivos de `Imágenes/` y cambiar los enlaces en la base de datos: cada enlace termina con el nombre de su archivo.

## Rehacer todo desde cero

- **El código** está en GitHub: `eLuztres/baifo`.
- **Los ajustes y las claves** de `.env` están en el gestor de contraseñas y en Vercel. Los pasos para montar una tienda nueva están en `docs/SETUP.md`.

## Comprobar que funciona

Las copias se hacen en GitHub, en *Actions → Weekly backup*. Si una falla, GitHub avisa por correo. Allí mismo, *Run workflow* hace una copia en el momento.
