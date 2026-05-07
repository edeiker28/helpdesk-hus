from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.location import Location
from app.models.user import User
from app.models.ticket import Ticket
from app.models.incident import Incident
from app.models.comment import Comment
from app.core.security import hash_password
from app.utils.enums import (
    UserRole, TicketStatus, TicketPriority,
    TicketCategory, IncidentStatus, IncidentSeverity
)
import logging

logger = logging.getLogger(__name__)


def seed_database():
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            logger.info("⏭️  La base de datos ya tiene datos, omitiendo seed.")
            return

        logger.info("🌱 Iniciando seed de la base de datos...")

        # ── Sedes ─────────────────────────────────────────────────
        sede_central = Location(
            name="HUS Central",
            address="Calle 26 No. 18-67, Sincelejo",
            phone="(095) 2804040",
            description="Sede principal del Hospital Universitario de Sincelejo",
        )
        sede_norte = Location(
            name="HUS Norte",
            address="Av. El Palmar, Sincelejo",
            phone="(095) 2804041",
            description="Sede norte del HUS",
        )
        sede_sur = Location(
            name="HUS Sur",
            address="Carrera 15 No. 30-45, Sincelejo",
            phone="(095) 2804042",
            description="Sede sur del HUS",
        )
        sede_urgencias = Location(
            name="HUS Urgencias",
            address="Calle 26 No. 18-70, Sincelejo",
            phone="(095) 2804043",
            description="Centro de urgencias del HUS",
        )

        db.add_all([sede_central, sede_norte, sede_sur, sede_urgencias])
        db.commit()
        logger.info("✅ Sedes creadas")

        # ── Usuarios ──────────────────────────────────────────────
        admin = User(
            full_name="Administrador HUS",
            email="admin@hus.gov.co",
            hashed_password=hash_password("Admin1234"),
            role=UserRole.ADMIN,
            department="Sistemas",
            phone="3001234567",
            location_id=sede_central.id,
        )
        tecnico1 = User(
            full_name="Carlos Pérez",
            email="carlos.perez@hus.gov.co",
            hashed_password=hash_password("Tecnico1234"),
            role=UserRole.TECHNICIAN,
            department="Soporte TI",
            phone="3017654321",
            location_id=sede_central.id,
        )
        tecnico2 = User(
            full_name="María López",
            email="maria.lopez@hus.gov.co",
            hashed_password=hash_password("Tecnico1234"),
            role=UserRole.TECHNICIAN,
            department="Soporte TI",
            phone="3029876543",
            location_id=sede_norte.id,
        )
        usuario1 = User(
            full_name="Juan García",
            email="juan.garcia@hus.gov.co",
            hashed_password=hash_password("Usuario1234"),
            role=UserRole.END_USER,
            department="Urgencias",
            phone="3041234567",
            location_id=sede_urgencias.id,
        )
        usuario2 = User(
            full_name="Ana Martínez",
            email="ana.martinez@hus.gov.co",
            hashed_password=hash_password("Usuario1234"),
            role=UserRole.END_USER,
            department="Radiología",
            phone="3059876543",
            location_id=sede_sur.id,
        )

        db.add_all([admin, tecnico1, tecnico2, usuario1, usuario2])
        db.commit()
        logger.info("✅ Usuarios creados")

        # ── Incidente ─────────────────────────────────────────────
        incidente = Incident(
            title="Falla en red del piso 3",
            description="Sin conectividad en las estaciones de trabajo del piso 3, área de hospitalización.",
            status=IncidentStatus.IN_PROGRESS,
            severity=IncidentSeverity.HIGH,
            created_by_id=admin.id,
        )
        db.add(incidente)
        db.commit()
        logger.info("✅ Incidente creado")

        # ── Tickets ───────────────────────────────────────────────
        ticket1 = Ticket(
            title="PC no enciende en consulta 5",
            description="El equipo de la consulta 5 no enciende desde esta mañana.",
            category=TicketCategory.HARDWARE,
            priority=TicketPriority.HIGH,
            status=TicketStatus.IN_PROGRESS,
            created_by_id=usuario1.id,
            assigned_to_id=tecnico1.id,
            incident_id=incidente.id,
            location_id=sede_urgencias.id,
        )
        ticket2 = Ticket(
            title="No puedo acceder al sistema de historias clínicas",
            description="Error de autenticación al intentar ingresar al HIS.",
            category=TicketCategory.ACCESS,
            priority=TicketPriority.CRITICAL,
            status=TicketStatus.OPEN,
            created_by_id=usuario2.id,
            location_id=sede_sur.id,
        )
        ticket3 = Ticket(
            title="Impresora de radiología no imprime",
            description="La impresora del área de radiología no responde.",
            category=TicketCategory.PRINTERS,
            priority=TicketPriority.MEDIUM,
            status=TicketStatus.RESOLVED,
            created_by_id=usuario2.id,
            assigned_to_id=tecnico2.id,
            location_id=sede_sur.id,
        )
        ticket4 = Ticket(
            title="Actualización de antivirus requerida",
            description="Los equipos del área administrativa requieren actualización de antivirus.",
            category=TicketCategory.SOFTWARE,
            priority=TicketPriority.LOW,
            status=TicketStatus.OPEN,
            created_by_id=usuario1.id,
            location_id=sede_central.id,
        )

        db.add_all([ticket1, ticket2, ticket3, ticket4])
        db.commit()
        logger.info("✅ Tickets creados")

        # ── Comentarios ───────────────────────────────────────────
        comentario1 = Comment(
            body="Ya estoy revisando el equipo, parece ser la fuente de poder.",
            is_internal=False,
            ticket_id=ticket1.id,
            author_id=tecnico1.id,
        )
        comentario2 = Comment(
            body="Nota interna: Verificar garantía del equipo antes de proceder.",
            is_internal=True,
            ticket_id=ticket1.id,
            author_id=tecnico1.id,
        )
        comentario3 = Comment(
            body="La impresora fue reiniciada y volvió a funcionar correctamente.",
            is_internal=False,
            ticket_id=ticket3.id,
            author_id=tecnico2.id,
        )

        db.add_all([comentario1, comentario2, comentario3])
        db.commit()
        logger.info("✅ Comentarios creados")

        logger.info("🎉 Seed completado exitosamente")
        logger.info("─" * 50)
        logger.info("🏥 Sedes creadas:")
        logger.info("   - HUS Central")
        logger.info("   - HUS Norte")
        logger.info("   - HUS Sur")
        logger.info("   - HUS Urgencias")
        logger.info("👤 Usuarios de prueba:")
        logger.info("   Admin:    admin@hus.gov.co       / Admin1234")
        logger.info("   Técnico1: carlos.perez@hus.gov.co / Tecnico1234")
        logger.info("   Técnico2: maria.lopez@hus.gov.co  / Tecnico1234")
        logger.info("   Usuario1: juan.garcia@hus.gov.co  / Usuario1234")
        logger.info("   Usuario2: ana.martinez@hus.gov.co / Usuario1234")
        logger.info("─" * 50)

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error en seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    seed_database()
