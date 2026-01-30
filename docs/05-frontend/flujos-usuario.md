# Frontend - Flujos de Usuario

## Flujo 1: Ver Estadisticas (Dashboard)

```mermaid
flowchart LR
    A[Usuario abre app] --> B[Dashboard]
    B --> C[Cargar /api/stats]
    C --> D[Mostrar estadisticas]

    D --> E[Total productos]
    D --> F[% matcheados]
    D --> G[Top diferencias de precio]
    D --> H[Productos por tienda]
```

**Pasos:**
1. Usuario abre la aplicacion
2. Se muestra el Dashboard automaticamente
3. Se carga estadisticas desde `/api/stats`
4. Usuario ve:
   - Total de productos en el sistema
   - Porcentaje de productos matcheados
   - Productos con mayor diferencia de precio entre tiendas
   - Cantidad de productos por tienda

---

## Flujo 2: Matchear Producto Manualmente

```mermaid
flowchart TD
    A[Ir a /unmatched] --> B[Ver lista de productos]
    B --> C[Filtrar por tienda/categoria]
    C --> D[Click en producto]
    D --> E{Buscar canonico existente}

    E -->|Encontrado| F[Seleccionar canonico]
    F --> G[POST /api/matches]
    G --> H[Match creado]

    E -->|No encontrado| I[Crear nuevo canonico]
    I --> J[POST /api/matches/canonical]
    J --> H

    H --> K[Producto desaparece de lista]
```

**Pasos detallados:**

1. **Navegar a productos sin match**
   - Click en "Unmatched" en el menu
   - Se carga lista desde `/api/products/unmatched`

2. **Filtrar productos**
   - Seleccionar tienda (Superseis, Stock, etc.)
   - Seleccionar categoria (bebidas, lacteos, etc.)
   - Buscar por nombre

3. **Seleccionar producto**
   - Click en un producto de la lista
   - Se abre modal de matching

4. **Buscar canonico existente**
   - Escribir nombre del producto
   - Se busca en `/api/matches/canonical/search`
   - Ver resultados con porcentaje de similitud

5. **Opcion A: Matchear con existente**
   - Seleccionar canonico de la lista
   - Click en "Matchear"
   - Se envia POST a `/api/matches`

6. **Opcion B: Crear nuevo canonico**
   - Click en "Crear nuevo"
   - Ingresar nombre, categoria, marca
   - Se envia POST a `/api/matches/canonical`

7. **Resultado**
   - Modal se cierra
   - Producto desaparece de la lista
   - Notificacion de exito

---

## Flujo 3: Comparar Precios

```mermaid
flowchart TD
    A[Ir a /matched] --> B[Ver productos matcheados]
    B --> C[Filtrar/buscar producto]
    C --> D[Click en Ver comparacion]
    D --> E[Cargar /api/compare/:id]
    E --> F[Mostrar precios por tienda]

    F --> G[Ver tienda mas barata]
    F --> H[Ver % diferencia]
    F --> I[Ver descuentos activos]
```

**Pasos detallados:**

1. **Navegar a productos matcheados**
   - Click en "Matched" en el menu
   - Se carga lista desde `/api/products/matched`

2. **Buscar producto**
   - Filtrar por categoria
   - Buscar por nombre (ej: "coca cola")
   - Ordenar por diferencia de precio

3. **Ver comparacion**
   - Click en producto o boton "Comparar"
   - Se abre pagina de comparacion
   - Se carga datos de `/api/compare/:canonicalId`

4. **Analizar precios**
   - Ver lista de tiendas ordenada por precio
   - Identificar tienda mas barata (resaltada)
   - Ver porcentaje de diferencia
   - Ver si hay descuentos activos

---

## Flujo 4: Revisar Matching Automatico

```mermaid
flowchart TD
    A[Job match:process ejecutado] --> B[Productos matcheados automaticamente]
    B --> C[Usuario va a /matched]
    C --> D[Ver productos recien matcheados]
    D --> E{Match correcto?}

    E -->|Si| F[No hacer nada]
    E -->|No| G[Deshacer match]
    G --> H[Producto vuelve a /unmatched]
    H --> I[Matchear manualmente]
```

**Pasos:**
1. Job de matching automatico se ejecuta
2. Usuario revisa productos matcheados
3. Identifica matches incorrectos
4. Deshace match (producto vuelve a unmatched)
5. Realiza match manual correcto

---

## Componentes de UI por Flujo

### Dashboard
```
┌─────────────────────────────────────────────┐
│ Dashboard                                    │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ 10,000  │ │  85%    │ │   6     │        │
│ │Products │ │ Matched │ │ Stores  │        │
│ └─────────┘ └─────────┘ └─────────┘        │
│                                             │
│ Top Price Differences                       │
│ ┌─────────────────────────────────────────┐│
│ │ Coca-Cola 2L    Stock ₲14.5k  +24%     ││
│ │ Leche La Serenisima  Fortis ₲8k +15%   ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Unmatched Products
```
┌─────────────────────────────────────────────┐
│ Unmatched Products                          │
├─────────────────────────────────────────────┤
│ Store: [Superseis ▼]  Category: [Bebidas ▼]│
│ Search: [________________]                  │
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐  │
│ │ [img] COCA COLA ORIGINAL 2LT          │  │
│ │       Superseis │ Bebidas │ ₲15.000   │  │
│ │                              [Match]  │  │
│ └───────────────────────────────────────┘  │
│ ┌───────────────────────────────────────┐  │
│ │ [img] PEPSI BLACK 1.5L                │  │
│ │       Superseis │ Bebidas │ ₲12.000   │  │
│ │                              [Match]  │  │
│ └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│ Page 1 of 30  [<] [1] [2] [3] ... [>]      │
└─────────────────────────────────────────────┘
```

### Match Dialog
```
┌─────────────────────────────────────────────┐
│ Match: COCA COLA ORIGINAL 2LT          [X] │
├─────────────────────────────────────────────┤
│ Search canonical: [coca cola 2l______]      │
│                                             │
│ Results:                                    │
│ ○ Coca-Cola Original 2L (95% match)        │
│ ○ Coca-Cola Zero 2L (82% match)            │
│ ○ Coca-Cola Original 1.5L (78% match)      │
│                                             │
│ ─────────────────────────────────────────  │
│ Or create new:                              │
│ Name: [Coca-Cola Original 2L_____]          │
│ Category: [Bebidas ▼]                       │
│                                             │
│        [Cancel]  [Create & Match]  [Match]  │
└─────────────────────────────────────────────┘
```

### Price Comparison
```
┌─────────────────────────────────────────────┐
│ Coca-Cola Original 2L                       │
│ Bebidas │ 5 tiendas │ Diferencia: 24%       │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐│
│ │ 🏆 Stock        ₲14.500  (-10%)  BEST! ││
│ │    Superseis    ₲15.000               ││
│ │    Casa Rica    ₲15.500               ││
│ │    Fortis       ₲16.000               ││
│ │    Biggie       ₲18.000               ││
│ └─────────────────────────────────────────┘│
│                                             │
│ Ahorro maximo: ₲3.500 (24%) vs Biggie      │
└─────────────────────────────────────────────┘
```
