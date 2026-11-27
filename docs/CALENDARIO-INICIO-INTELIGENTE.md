# SHALOM · calendario e inicio inteligente (fase base)

El calendario móvil es de consulta local y no depende de IA. El catálogo actual de repertorios publicados sigue siendo el único origen de las actividades del coro; no se duplican tablas ni se alteran datos. Los borradores no aparecen.

## Alcance litúrgico
Cómputo gregoriano de Pascua y Adviento, tiempos principales, ciclo dominical y fechas mayores. México: Epifanía en domingo entre el 2 y el 8 de enero y Bautismo correspondiente. El calendario civil clasifica Jueves Santo como Triduo para planificación, sin pretender resolver Misa Crismal, vísperas o celebraciones nocturnas. Los colores mostrados pertenecen al tiempo, no a todas las misas del día. No es un ordo: faltan santoral, precedencias, propias de Toluca/parroquia, lecturas, transferencias y excepciones. No generar ni copiar textos de lecturas sin fuente autorizada. 
Referencias de verificación de fechas: https://gcatholic.org/calendar/2026/MX-es.htm y https://gcatholic.org/calendar/2027/MX-es ; https://www.usccb.org/prayer-worship/liturgical-year ; https://arquileon.org.mx/fe-y-liturgia/calendario-liturgico-2027/ . Verificar con el ordo diocesano antes de utilizar para planificación definitiva.

## Inicio
Pestañas Para ti, Liturgia, Ensayar, Mis cantos, saludo contextual, accesos en dos columnas, sugerencias de navegación a contenido existente, calendario mensual y eventos publicados, acción de lectura inmersiva de la misa en Android. Las sugerencias son accesos contextuales, no recomendaciones algorítmicas personalizadas. No se atribuyen horarios, lecturas ni asistencia inventados.

## Pendiente
Validación visual y APK, fuente autorizada de lecturas y calendario propio, edición de eventos sin repertorio, configuración personal, web y modo músico dedicado. No hay cambio de esquema ni despliegue a producción.

## Segunda etapa: referencias litúrgicas fechadas
Fuente concreta: https://arquidiocesistoluca.org.mx/wp-content/uploads/2026/11/Misal-noviembre-2026.pdf (p.160 y 166). Referencias de 29 y 30 de noviembre de 2026, sin reproducir traducciones. Se distingue color de la celebración del color del tiempo. Cualquier otra fecha sin registro muestra ausencia de cobertura. Ascensión y Sagrado Corazón coinciden en las referencias contrastadas para 2027. Corpus Christi y traslados del santoral se mantienen sin calcular hasta resolver discrepancias de fuentes. Próxima etapa: catálogo de referencias verificadas con fecha y procedencia, revisión diocesana y flujo editorial, no consumir endpoints sin documentación ni asumir derechos de redistribución.

## Tercera etapa
8 fechas adicionales con citas bíblicas y cuatro formularios de Navidad (24 vigilia vespertina, 25 noche, aurora y día); no seleccionar automáticamente una misa navideña ni confundirla con la mañana del 24. Fuentes: https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf páginas 26–27; https://laverdadcatolica.org/misal-sabado-12-de-diciembre-del-2026/ (Guadalupe, propio mexicano), corroborada por https://virgendeguadalupe.org.mx/wp-content/uploads/2025/11/12-de-diciembre.pdf. La guía FDLC tiene una fecha contradictoria para Bautismo del Señor, por eso no se incorporaron sus lecturas. Las sugerencias solo cruzan categorías explícitas católicas con tiempo o Guadalupe; sin inferir idoneidad para un momento ritual. Cobertura parcial, no se copian traducciones.

## Cuarta etapa: agenda Admin web
El motor de fechas y referencias tiene una única fuente compartida por Android y navegador. Agenda mensual dentro de Repertorios: identifica borradores y publicados, abre repertorios existentes, crea un borrador fechado de misa/ensayo y conserva campos al navegar por meses. Confirmación para abandonar cambios; guardar y publicar mantienen los permisos y el flujo existentes. Sin migraciones ni horarios inventados. Pendiente web pública, calendario de eventos sin repertorio y Admin nativo.

## Quinta etapa: calendario público web
Se reutilizan el motor litúrgico, las referencias, el renderizador de cuadrícula mensual y los estilos web compartidos con Admin. Repertorios incluye una vista mensual de consulta y enlaces a los repertorios publicados; Inicio muestra el día y el próximo evento disponible. No se consulta contenido privado, no se escribe en Supabase ni se altera el lector. Si falla la conexión, se conserva el calendario base y se informa que las actividades no pudieron consultarse. Las referencias navideñas requieren elegir el formulario. El verificador de dependencias de Admin ahora comprueba rutas relativas completas y orden de carga. Cobertura anual y administración nativa pendientes.
