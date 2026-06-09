# EXECUTION_RULES

## Proposito

Definir como debe actuar un agente sobre NexArtPro para no saltarse evidencia, prioridades ni reglas de cambio minimo.

## Source of truth

- El repo real es `Racielf/proestimate-fsm`
- El workspace local es temporal
- Un cambio no cuenta como cerrado solo por existir localmente

## Flujo obligatorio

1. Ubicar el modulo afectado
2. Verificar archivos reales
3. Diagnosticar gap exacto
4. Proponer cambio minimo
5. Ejecutar solo si el modo y la aprobacion lo permiten

## Modos

### Analisis solamente

- no tocar codigo
- no mutar datos
- devolver hallazgos y siguiente paso

### Proponer

- describir cambio minimo recomendado
- no implementar todavia

### Implementar

- ejecutar cambio pequeno y compatible con la arquitectura actual
- evitar refactors grandes
- no redisenar modulos existentes sin instruccion explicita

## Confirmacion

- cualquier cambio relevante requiere confirmacion explicita del usuario
- `haslo`, `ejecutalo` o equivalente cuenta como aprobacion

## Reglas de escritura

- no inventar archivos, rutas o entidades no verificadas como si ya existieran
- no duplicar logica si ya hay un modulo real
- no reabrir discusiones cerradas si ya quedaron documentadas en `/docs/agent/`
- cuando falte evidencia, marcarlo como `desconocido` o `pendiente de verificar`

## Regla de implementacion minima

Preferir en este orden:

1. extender lo que ya existe
2. endurecer lo que ya existe
3. desacoplar con cambio pequeno
4. crear algo nuevo solo si realmente falta

## Regla de salida

En cada cierre, distinguir siempre:

1. que quedo preparado o validado localmente
2. que ya quedo reflejado en el repo real de GitHub
3. que falta para darlo por cerrado