# Photobooth - Our Wedding (Angel & Clara)

## 📌 Contexto del Proyecto
Este es un **Photo Booth digital** (PWA) creado para la boda de **Angel y Clara** (16 de julio de 2026). La aplicación permite a los invitados capturar fotos en diferentes formatos (Retrato, Díptico, Rollo), aplicar filtros en tiempo real y descargar/enviar el resultado final con un diseño de celuloide personalizado.

## 🤖 Colaboración de Agentes
- **Claude (Anthropic)**: Ayudó en la fase inicial de diseño y arquitectura, definiendo la estructura de `app.js`, la lógica de composición en Canvas y la implementación de filtros mediante matrices de color para asegurar compatibilidad en iOS/Safari.
- **Gemini CLI**: Actuando como ingeniero de software autónomo para la implementación, refinamiento y mantenimiento del código.

## 🛠️ Estado Actual
- **Modos de Sesión**: Retrato (1 foto), Díptico (2 fotos), Rollo (4 fotos). Todos usan un aspecto 4:3.
- **Composición**: Se genera una tira de película (filmstrip) con perforaciones laterales, títulos personalizados y nombres de los novios.
- **Filtros**: Implementados vía matrices de color (BW, Sepia, Vintage, Warm, Cool) para máxima consistencia.
- **PWA**: Configurada con Manifest y Service Worker (básico).
- **Internacionalización**: Soporte para Español e Inglés (detectado por navegador o selección manual).

## 🚀 Próximos Pasos
1.  **Backend de Envío**: Conectar el botón de "Enviar por Correo" con una API real (Fase 2).
2.  **Optimización de SW**: Mejorar el cacheo de recursos críticos para funcionamiento offline.
3.  **Refinamiento UI**: Ajustar transiciones y animaciones entre pantallas.

---
*Este archivo es actualizado por Gemini CLI tras cada sesión de cambios significativa.*
