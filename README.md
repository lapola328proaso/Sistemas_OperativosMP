# 🖥️ Stress Monitor — Miniproyecto Sistemas Operativos 2026-1

**Universidad del Valle — Sede Tuluá**  
**Materia:** Sistemas Operativos  
**Profesor:** Julian Enrique Castro Segura  

---

## ¿Qué es este proyecto?

Stress Monitor es una aplicación web que permite estresar el sistema operativo de forma controlada y observar en tiempo real cómo responden sus recursos: CPU, RAM y conexiones a base de datos.

El proyecto tiene dos componentes:

- **Actividad 1 — Dashboard web:** una aplicación Next.js con múltiples mecanismos de estrés que se pueden activar y detener de forma independiente, con gráficas en tiempo real de CPU, RAM y conexiones activas a PostgreSQL.
- **Actividad 2 — Notebook de entrenamiento:** un notebook de Jupyter que entrena una red neuronal convolucional con PyTorch, generando carga real sobre el CPU y la RAM del sistema.

---

## Arquitectura del proyecto

```
Sistemas_OperativosMP/
├── stress-monitor/          # Aplicación web (Next.js + PostgreSQL)
│   ├── app/
│   │   ├── api/
│   │   │   ├── init/        # Endpoint para inicializar la base de datos
│   │   │   ├── metrics/     # Endpoint de métricas en tiempo real
│   │   │   └── stress/
│   │   │       ├── cpu/     # Estrés de CPU
│   │   │       ├── memory/  # Estrés de memoria
   │   │       ├── http/    # HTTP Flood
│   │   │       └── db/      # Estrés de base de datos (insert, select, lock)
│   │   └── page.tsx         # Dashboard principal
│   ├── components/
│   │   └── stress/          # Componentes de control por mecanismo
│   ├── lib/
│   │   ├── db.ts            # Pool de conexiones PostgreSQL + initDB()
│   │   └── stress-engine.ts # Motor de estrés con estado global
│   ├── docker-compose.yml   # PostgreSQL en Docker
│   └── package.json
└── training_ai_model.ipynb  # Notebook de entrenamiento con PyTorch
```

---

## Mecanismos de estrés implementados

| Mecanismo | Qué hace | Recurso afectado |
|---|---|---|
| **CPU Stress** | Workers JavaScript con cálculos matemáticos en bucle | CPU |
| **Memory Stress** | Reserva bloques de RAM sin liberarlos (simula memory leak) | RAM |
| **HTTP Flood** | Cientos de peticiones por segundo contra la propia app | CPU / Event loop |
| **DB Insert masivo** | Inserts concurrentes a PostgreSQL con UUID, JSON y texto | Disco / PostgreSQL |
| **DB Select con JOIN** | Consultas analíticas con JOIN y GROUP BY repetidas | PostgreSQL |
| **Lock Contention** | Transacciones concurrentes sobre la misma fila (bloqueos reales) | PostgreSQL |
| **Entrenamiento IA** | Red neuronal convolucional con PyTorch sobre imágenes sintéticas | CPU / RAM |

---

## Requisitos previos

Antes de clonar el proyecto, asegúrate de tener instalado lo siguiente:

- **Node.js** v18 o superior → [nodejs.org](https://nodejs.org)
- **pnpm** → `npm install -g pnpm`
- **Docker Desktop** → [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Python 3.10+** (para el notebook) → [python.org](https://python.org)
- **Jupyter Notebook** → `pip install notebook`

> Si usas Windows, se recomienda correr todo desde **WSL 2** (Ubuntu 24).

---

## Guía de instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/lapola328proaso/Sistemas_OperativosMP.git
cd Sistemas_OperativosMP
```

### 2. Entrar a la carpeta de la aplicación web

```bash
cd stress-monitor
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Configurar variables de entorno

Crear un archivo `.env.local` en la carpeta `stress-monitor/`:

```bash
cp .env.example .env.local
```

Si no existe `.env.example`, crear el archivo manualmente:

```bash
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stressdb' > .env.local
```

### 5. Levantar la base de datos con Docker

Asegúrate de que Docker Desktop esté abierto y corriendo, luego:

```bash
docker compose up -d
```

Verifica que el contenedor esté activo:

```bash
docker ps
```

Deberías ver `stress_postgres` con estado `Up`.

### 6. Iniciar la aplicación

```bash
pnpm dev
```

La aplicación queda disponible en: **http://localhost:3000**

### 7. Inicializar la base de datos

En otra terminal, ejecutar:

```bash
curl -X POST http://localhost:3000/api/init
```

Respuesta esperada: `{"ok":true,"message":"DB initialized"}`

Esto crea automáticamente todas las tablas necesarias:
- `stress_data` — datos de las inserciones masivas
- `metrics_history` — historial de métricas del sistema
- `lock_test` — fila usada para la contención de locks
- `stress_categories` — categorías A-E para los JOINs

---

## Uso del dashboard

Abre **http://localhost:3000** en el navegador. Desde ahí puedes:

- Activar y detener cada mecanismo de estrés de forma independiente
- Ver gráficas en tiempo real de CPU, RAM y conexiones a PostgreSQL
- Usar el botón **Stop All** para detener todos los mecanismos a la vez

### Ver lock contention en tiempo real

Mientras el mecanismo de Lock Contention está activo, ejecutar en otra terminal:

```bash
docker exec -it stress_postgres psql -U postgres -c "SELECT pid, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state = 'active';"
```

Verás los procesos bloqueados con `wait_event = tuple` esperando el lock.

---

## Actividad 2 — Notebook de entrenamiento

### Instalar dependencias de Python

```bash
pip install notebook psutil matplotlib numpy torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

> En WSL usar: `pip install ... --break-system-packages`

### Abrir el notebook

```bash
cd ..   # volver a la raíz del repo
jupyter notebook
```

Abrir el archivo `training_ai_model.ipynb` desde el navegador en **http://localhost:8888**.

### Configuración recomendada según RAM disponible

Antes de ejecutar, ajustar estos valores en la celda del dataset:

| RAM disponible | IMG_SIZE | BATCH_SIZE |
|---|---|---|
| Menos de 4 GB | 300 | 1 |
| 4 GB - 8 GB | 800 | 1 |
| 8 GB o más | 2000 | 2 |

Ejecutar las celdas en orden con **Shift + Enter**. Mientras entrena, abrir otra terminal con `htop` para observar el impacto sobre el CPU.

---

## Observación del sistema durante las cargas

Se recomienda tener abiertas estas herramientas mientras se experimenta:

```bash
# Terminal 1 — Ver procesos y consumo de CPU/RAM
htop

# Terminal 2 — Ver consumo por contenedor Docker
docker stats

# Terminal 3 — Ver conexiones activas en PostgreSQL
docker exec -it stress_postgres psql -U postgres -c \
  "SELECT pid, wait_event_type, wait_event, state FROM pg_stat_activity WHERE state = 'active';"
```

---

## Tecnologías utilizadas

- **Next.js 16.2.7** con App Router
- **React 19**
- **PostgreSQL 15** (vía Docker)
- **node-postgres (pg)** para el pool de conexiones
- **Tailwind CSS 4** para el frontend
- **PyTorch 2.x** para el entrenamiento del modelo
- **Jupyter Notebook** para la Actividad 2

> Se utilizó Next.js 16.2.7 en lugar de la versión 14 indicada en el enunciado por compatibilidad con el entorno de desarrollo. La arquitectura con App Router y todas las funcionalidades requeridas son idénticas.

---

## Integrantes

- **Juan Manuel Polania Navarro** — Código 2477452
- **Kevin Palomino Murcia** — Código 2477200

---

*Miniproyecto — Sistemas Operativos 2026-1 — Universidad del Valle Sede Tuluá*
