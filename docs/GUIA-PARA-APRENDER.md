# Aprende a programar con SHALOM

Esta guía está pensada para aprender poco a poco **con el código real de tu proyecto**, sin arriesgar la página pública ni los datos del coro.

## 1. Las cinco piezas que debes conocer

| Tecnología | Qué hace en SHALOM | Primer archivo para mirar |
| --- | --- | --- |
| HTML | Estructura y textos de las páginas | `index.html` |
| CSS | Colores, espacios, tipografía y diseño | `style.css` |
| JavaScript | Búsquedas, botones, navegación y datos | `home.js` |
| Supabase + SQL | Guarda cantos, artistas, usuarios y repertorios | `Supabase.js` y archivos `*.sql` |
| React Native | Construye las pantallas de Android | `mobile/App.js` |

## 2. Tu primera práctica: encontrar el título de Inicio

Abre `index.html` y busca el elemento `<h1>`. El HTML define qué dice la página. Después abre `style.css` y busca las reglas del encabezado y `.hero`: el CSS define cómo se ve.

**Ejercicio seguro:** en una rama de prueba, cambia un texto del encabezado y observa el resultado en una copia local. No publiques todavía.

## 3. Cómo seguir un botón

1. Busca el botón o enlace en el HTML.
2. Si tiene `href`, comprueba a qué página apunta.
3. Si usa un `id` o una clase, búscalos en el JavaScript relacionado.
4. Identifica el evento `click` y la función que se ejecuta.
5. Anota qué datos lee o modifica la función.

Ejemplo: el botón «Explorar canciones» de `index.html` enlaza a `canciones.html`. Esa página carga la lógica de listado de cantos.

## 4. Cómo entender los datos

- **Canción**: letra, título, acordes y relaciones.
- **Artista**: intérprete, ministerio o coro relacionado con canciones.
- **Categoría**: forma de agrupar cantos.
- **Repertorio**: selección ordenada de cantos para misa o ensayo.
- **Popurrí**: varios cantos reunidos para leerlos de forma continua.

En el sitio, JavaScript consulta Supabase. En Android, `mobile/src/sync.js` descarga los datos públicos y `mobile/src/database.js` los guarda para leerlos sin internet.

## 5. Entender un cambio sin romper otras funciones

Antes de modificar algo, responde estas preguntas:

1. ¿Qué pantalla muestra la función?
2. ¿Qué archivo define su apariencia?
3. ¿De dónde llegan los datos?
4. ¿Qué otros archivos la utilizan?
5. ¿Qué prueba demuestra que sigue funcionando?

Usa `docs/ARQUITECTURA.md` como mapa y `docs/DESARROLLO.md` para saber cómo ejecutar pruebas.

## 6. Aprende Git y GitHub

- **Repositorio**: carpeta con el proyecto y su historial.
- **Commit**: cambio guardado con una explicación.
- **Rama**: espacio separado para experimentar sin alterar `main`.
- **Pull request**: propuesta de cambios que se revisa antes de incorporarla.
- **GitHub Actions**: comprobaciones y compilaciones automáticas.

**Regla importante:** aprende en una rama, revisa los cambios y solo después publícalos.

## 7. Ruta de aprendizaje recomendada

1. HTML: títulos, enlaces, formularios.
2. CSS: colores, tamaños, disposición y adaptación móvil.
3. JavaScript: variables, funciones, listas y eventos.
4. Git/GitHub: ramas, commits y revisiones.
5. Supabase: consultas, tablas, relaciones y permisos.
6. React Native: componentes, estado y navegación.
7. Pruebas: verificar que un cambio no rompa otros.

## 8. Mini proyecto de práctica

**Objetivo:** cambiar únicamente el texto de presentación de Inicio.

- Crear una rama `aprendizaje/texto-inicio`.
- Encontrar `index.html` y su `<h1>`.
- Cambiar el texto sin tocar atributos ni enlaces.
- Comprobar que el HTML se abre y los enlaces siguen funcionando.
- Revisar la diferencia del commit.
- No fusionar la rama hasta estar conforme.

Este ejercicio evita tocar la base de datos y la app Android.

## 9. Cómo pedir ayuda a otro programador

Comparte:
- El repositorio `shalomcoroacordes-a11y/Shalom`.
- `docs/ARQUITECTURA.md`.
- `docs/DESARROLLO.md`.
- `docs/PLAN-REORGANIZACION.md`.
- Una descripción concreta del cambio y cómo debe verse.
- Los resultados de pruebas y cualquier error.

Nunca compartas contraseñas o claves privadas dentro de archivos, commits o capturas.
