# Diagramas de Arquitectura

## Arquitectura General

```mermaid
flowchart TB
    subgraph Scrapers["Scrapers"]
        S1[Superseis]
        S2[Stock]
        S3[Fortis]
        S4[Casa Rica]
        S5[Biggie]
        S6[Salemma]
        S7[Arete]
    end

    subgraph Database["PostgreSQL"]
        ST[Store]
        P[Product]
        PR[Price]
        PM[ProductMatch]
        CP[CanonicalProduct]
        CA[CanonicalAlias]
        FO[FeaturedOffer]
    end

    subgraph API["API REST"]
        E1["/api/products"]
        E2["/api/matches"]
        E3["/api/compare"]
        E4["/api/stores"]
        E5["/api/stats"]
        E6["/api/featured"]
        E7["/api/canonical"]
    end

    subgraph Frontend["Frontend React"]
        D[Dashboard]
        U[Unmatched]
        M[Matched Products]
        C[Compare]
        PG[Products]
        AF[Admin Featured]
    end

    Scrapers -->|scrape & save| P
    P --> PR
    P --> PM
    PM --> CP
    CP --> CA
    CP --> FO
    ST --> P

    Database --> API
    API --> Frontend
```

## Diagrama ER - Base de Datos

```mermaid
erDiagram
    Store ||--o{ Product : "has many"
    Store ||--o{ Price : "has many"
    Product ||--o{ Price : "has many"
    Product ||--o| ProductMatch : "has one"
    CanonicalProduct ||--o{ ProductMatch : "has many"
    CanonicalProduct ||--o{ CanonicalAlias : "has many"

    Store {
        uuid id PK
        string name UK
        string slug UK
        enum type
        string logoUrl
        string websiteUrl
        boolean isActive
        datetime lastScrapedAt
    }

    Product {
        uuid id PK
        string name
        string normalizedName
        string baseNormalizedName
        string brand
        string category
        string unit
        float quantity
        string barcode
        string externalId
        string imageUrl
        boolean isHidden
        uuid storeId FK
    }

    Price {
        uuid id PK
        decimal price
        decimal oldPrice
        string currency
        string sourceUrl
        datetime scrapedAt
        uuid productId FK
        uuid storeId FK
    }

    CanonicalProduct {
        uuid id PK
        string name
        string displayName
        string normalizedName UK
        string baseNormalizedName
        string brand
        string category
        float quantity
        string unit
        string primaryBarcode UK
    }

    ProductMatch {
        uuid id PK
        enum matchType
        float confidence
        boolean isVerified
        uuid productId FK UK
        uuid canonicalProductId FK
    }

    CanonicalAlias {
        uuid id PK
        string normalizedName UK
        uuid canonicalProductId FK
    }

    FeaturedOffer {
        uuid id PK
        uuid canonicalProductId FK UK
        int displayOrder
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    CanonicalProduct ||--o| FeaturedOffer : "has one"
```

## Flujo de Scraping

```mermaid
sequenceDiagram
    participant CLI as CLI/Job
    participant S as Scraper
    participant W as Website
    participant DB as PostgreSQL

    CLI->>S: scrapeAll()
    loop Por cada categoria
        S->>W: GET /categoria/page/1
        W-->>S: HTML
        S->>S: parseHtml() con Cheerio
        S->>S: Extraer productos

        loop Por cada pagina adicional
            S->>W: GET /categoria/page/N
            W-->>S: HTML
            S->>S: parseHtml()
        end
    end

    S->>S: normalizeProductName()
    S->>DB: upsert Store

    loop Por cada producto
        S->>DB: upsert Product
        S->>DB: create Price
    end

    S-->>CLI: ScraperResult
```

## Flujo de Matching

```mermaid
flowchart TD
    A[Product sin match] --> B{Tiene barcode?}

    B -->|Si| C{Existe CanonicalProduct<br/>con ese barcode?}
    C -->|Si| D[Match BARCODE<br/>100% confianza]
    C -->|No| E

    B -->|No| E{Existe Alias<br/>con este normalizedName?}
    E -->|Si| F[Match ALIAS<br/>99% confianza]

    E -->|No| G{Fuzzy similarity<br/>>= 0.85?}
    G -->|Si| H{Medidas<br/>compatibles?}
    H -->|Si| I[Match FUZZY<br/>+ crear Alias]
    H -->|No| J

    G -->|No| J[Crear nuevo<br/>CanonicalProduct]

    D --> K[Crear ProductMatch]
    F --> K
    I --> K
    J --> K

    K --> L[Crear CanonicalAlias]
```

## Flujo de Comparacion de Precios

```mermaid
flowchart LR
    subgraph Input
        Q[Usuario busca<br/>'coca cola 2l']
    end

    subgraph Search
        S1[Buscar en<br/>CanonicalProduct]
        S2[Obtener ProductMatches]
    end

    subgraph Data
        P1[Product Superseis]
        P2[Product Stock]
        P3[Product Fortis]
    end

    subgraph Prices
        PR1["₲15.000"]
        PR2["₲14.500"]
        PR3["₲16.000"]
    end

    subgraph Output
        R[Resultado ordenado<br/>Stock: ₲14.500<br/>Superseis: ₲15.000<br/>Fortis: ₲16.000]
    end

    Q --> S1
    S1 --> S2
    S2 --> P1 & P2 & P3
    P1 --> PR1
    P2 --> PR2
    P3 --> PR3
    PR1 & PR2 & PR3 --> R
```

## Niveles de Matching

```mermaid
graph TD
    subgraph Nivel1["Nivel 1: BARCODE"]
        B1[Producto con barcode]
        B2[CanonicalProduct.primaryBarcode]
        B1 -->|"Match exacto"| B2
        B3["100% confianza"]
    end

    subgraph Nivel2["Nivel 2: ALIAS"]
        A1[Product.normalizedName]
        A2[CanonicalAlias.normalizedName]
        A1 -->|"Lookup exacto"| A2
        A3["99% confianza"]
    end

    subgraph Nivel3["Nivel 3: FUZZY"]
        F1[Product.normalizedName]
        F2["pg_trgm similarity()"]
        F3[CanonicalProduct.normalizedName]
        F1 --> F2
        F2 --> F3
        F4["60-95% confianza"]
    end

    subgraph Nivel4["Nivel 4: NUEVO"]
        N1[No hay match]
        N2[Crear CanonicalProduct]
        N1 --> N2
    end
```

## Arquitectura de Componentes Frontend

```mermaid
flowchart TB
    subgraph App
        Router[React Router]
    end

    subgraph Pages
        Dashboard
        UnmatchedProducts
        MatchedProducts
        Compare
        Products
        AdminFeatured
    end

    subgraph State
        TQ[TanStack Query]
        RHF[React Hook Form]
    end

    subgraph API
        Fetch["/api/*"]
    end

    Router --> Pages
    Pages --> State
    State --> API
```

## Diagrama de Deployment

```mermaid
flowchart TB
    subgraph Development
        DEV[npm run dev:full]
        DEV --> API1[Express :3001]
        DEV --> VITE[Vite :5173]
        DEV --> PG1[PostgreSQL :5433]
    end

    subgraph Production
        PM2[PM2]
        PM2 --> CRON[Cron Jobs]
        PM2 --> API2[Express API]
        API2 --> PG2[PostgreSQL]
    end

    CRON -->|"Cada 6h"| SCRAPERS[Scrapers]
    SCRAPERS --> PG2
```
