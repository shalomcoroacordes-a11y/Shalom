# Reconciliación del lector Inter con la base oficial

Base publicada: Pública 0.4.27 (50), Admin 0.1.8 (9). La rama main divergía de esas publicaciones. La integración conserva la línea de las releases y ahora incluye el historial de main.

Se revisaron los tres commits exclusivos de main (paleta unificada y dos controles de continuidad). Los cambios de color, fondo y texto están presentes en la rama oficial; las diferencias de dimensiones usan GUTTER, ICON y type del sistema de diseño 0.4.27. La barra inferior conserva el indicador animado de la versión publicada, no se reinstala el fondo estático de la 0.4.24. Las diferencias del lector conservan text-size-adjust y la nueva geometría proporcional. Los workflows conservan la autorización manual de SHA, el control de ascendencia y las comprobaciones de identidad; los publicadores históricos no se restauran. Los controles de main se conservan en sus versiones equivalentes o ampliadas.

Esta reconciliación solo integra historiales en la rama candidata. No fusiona main, no despliega Pages, no publica APK y no modifica Supabase. Antes de fusionar: CI del SHA reconciliado, navegador y APK de prueba; completar lectores web de colecciones y Studio, verificar regresiones, preparar identidades de lanzamiento superiores y ensayar contra las últimas APK reales.
