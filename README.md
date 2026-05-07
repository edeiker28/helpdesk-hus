#  HelpDesk HUS — Sistema de Mesa de Ayuda

Sistema de gestión de tickets e incidentes desarrollado para el **Hospital Universitario de Sincelejo (HUS)**.

---

##  Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| Python 3.12 | Lenguaje principal |
| FastAPI | Framework web |
| SQLAlchemy 2.0 | ORM |
| Alembic | Migraciones de BD |
| MariaDB 11.4 | Base de datos |
| Docker + Docker Compose | Contenedores |
| JWT | Autenticación |
| bcrypt | Hash de contraseñas |

---

##  Funcionalidades

-  Gestión de tickets (crear, asignar, actualizar, cerrar)
-  Gestión de incidentes (agrupar tickets)
-  Usuarios con roles (admin, técnico, usuario final)
-  Comentarios internos y públicos en tickets
-  Archivos adjuntos (PDF, imágenes, documentos)
-  Notificaciones internas
-  Dashboard con métricas
-  API REST documentada con Swagger

---

##  Roles del Sistema

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total al sistema |
| `technician` | Gestión de tickets e incidentes asignados |
| `end_user` | Crear y ver sus propios tickets |

---

##  Estructura del Proyecto
helpdesk-hus/
├── app/
│   ├── core/           # Seguridad JWT y dependencias
│   ├── models/         # Modelos SQLAlchemy
│   ├── routers/        # Endpoints de la API
│   ├── schemas/        # Validación Pydantic
│   ├── services/       # Lógica de negocio
│   ├── utils/          # Enums y utilidades
│   └── main.py         # Punto de entrada
├── alembic/            # Migraciones de BD
├── .env.example        # Plantilla de variables
├── docker-compose.yml  # Orquestación Docker
├── Dockerfile          # Imagen de la app
└── requirements.txt    # Dependencias Python



---

##  Instalación y Configuración

### Prerrequisitos
- Docker Desktop instalado y corriendo
- Git

### Pasos

**1. Clona el repositorio**
```bash
git clone https://github.com/edeiker28/helpdesk-hus.git
cd helpdesk-hus
```

**2. Crea el archivo de variables de entorno**
```bash
cp .env.example .env
```

**3. Edita el `.env` con tus valores**
```env
DB_HOST=db
DB_PORT=3306
DB_USER=helpdesk_user
DB_PASSWORD=helpdesk_pass
DB_NAME=helpdesk_db
SECRET_KEY=tu_secreto_seguro_aqui
```

**4. Levanta los contenedores**
```bash
docker-compose up --build
```

**5. Carga los datos de prueba (opcional)**
```bash
docker exec helpdesk_app python -m app.utils.seed
```

**6. Accede a la documentación**
http://localhost:8000/docs

---

##  Usuarios de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@hus.gov.co | Admin1234 |
| Técnico | carlos.perez@hus.gov.co | Tecnico1234 |
| Técnico | maria.lopez@hus.gov.co | Tecnico1234 |
| Usuario | juan.garcia@hus.gov.co | Usuario1234 |
| Usuario | ana.martinez@hus.gov.co | Usuario1234 |

---

##  Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/register` | Registrar usuario |
| GET | `/api/v1/tickets/` | Listar tickets |
| POST | `/api/v1/tickets/` | Crear ticket |
| PATCH | `/api/v1/tickets/{id}` | Actualizar ticket |
| GET | `/api/v1/incidents/` | Listar incidentes |
| POST | `/api/v1/incidents/` | Crear incidente |
| GET | `/api/v1/dashboard/` | Métricas del sistema |
| GET | `/api/v1/notifications/` | Notificaciones |

---

## Estados de Tickets e Incidentes
open → in_progress → resolved → closed

## Prioridades de Tickets
low → medium → high → critical

---

##  Comandos Docker Útiles

```bash
# Levantar la app
docker-compose up

# Levantar en background
docker-compose up -d

# Ver logs
docker logs helpdesk_app

# Detener
docker-compose down

# Generar migración
docker exec helpdesk_app alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
docker exec helpdesk_app alembic upgrade head
```

---

##  Desarrollado con

- **FastAPI** — https://fastapi.tiangolo.com
- **SQLAlchemy** — https://sqlalchemy.org
- **Alembic** — https://alembic.sqlalchemy.org
- **MariaDB** — https://mariadb.org

---

##  Licencia

Proyecto personal — Hospital Universitario de Sincelejo © 2026

