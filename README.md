# Prueba API Gemini en GitHub Pages

Mini web estatica para probar Gemini API desde el navegador.

## Que incluye

- `index.html`: interfaz.
- `style.css`: estilos.
- `app.js`: llamadas REST a Gemini.
- Modo `generateContent` para texto/vision.
- Modo `interactions` para generacion/edicion de imagen si tu cuenta/modelo lo permite.

## Advertencia de seguridad

Esta demo usa la API key desde el navegador. Es util para pruebas, pero no es seguro para produccion.
No guardes la API key dentro del codigo ni la subas a GitHub.

Para produccion usa un backend o una funcion server-side, por ejemplo Supabase Edge Functions, Cloudflare Workers o Firebase Functions.

## Como probar localmente

Puedes abrir `index.html` directamente en el navegador.

Si el navegador bloquea algo, inicia un servidor local simple:

```bash
python3 -m http.server 5173
```

Luego abre:

```text
http://localhost:5173
```

## Como publicarlo en GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `gemini-test`.
2. Sube estos archivos a la raiz del repo.
3. En GitHub entra a `Settings > Pages`.
4. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda.
6. GitHub te mostrara una URL similar a:

```text
https://TU_USUARIO.github.io/gemini-test/
```

## Modelos sugeridos

Para texto/vision:

```text
gemini-2.5-flash
```

Para imagen:

```text
gemini-3.1-flash-image
```

El acceso a modelos de imagen puede depender de tu cuenta, region, facturacion y disponibilidad.

## Prompt de prueba para prendas

```text
Transforma esta foto de una prenda real en un asset frontal, limpio y plano para una app de closet virtual.
Conserva color, textura, estampado, costuras, botones y logos.
Corrige perspectiva e inclinacion.
Reduce arrugas visibles sin cambiar la identidad de la prenda.
Elimina fondo, manos, sombras, piso, pared, ganchos o elementos externos.
Devuelve la prenda centrada en un canvas transparente.
No agregues maniqui, cuerpo humano ni accesorios.
```
