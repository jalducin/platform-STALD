## Decisiones

1. **Tarball, no blobs ni GraphQL**: una consulta a la API por versión; la descarga va a codeload, fuera del límite.
2. **Texto en memoria**: el JSON se interpreta al leer cada archivo; cada lectura recibe su propio objeto.
3. **`sha` de git calculado** (`sha1("blob <n>\0" + bytes)`): las prórrogas escriben con concurrencia optimista.
4. **Escrituras**: van a GitHub; esa ruta y su carpeta se leen directo hasta cargar un paquete pedido después de escribir.
5. **Respaldo en Postgres solo de emergencia**: se escribe al bajar una versión nueva y se lee si GitHub falla (ahorra
   tráfico de Supabase). No contradice `cierre-tecnico`: ahí se quitó el respaldo de los datos vivos; esto es contenido.
6. **Falla con copia**: se sirve la copia y se reintenta a los 60 s. Las lecturas simultáneas comparten una sola carga.
7. **Paquete sin archivos de `contenido/`**: se trata como falla (no borra las clases).
