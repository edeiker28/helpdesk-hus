from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    TECHNICIAN = "technician"
    END_USER = "end_user"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TicketCategory(str, Enum):
    HARDWARE = "hardware"
    SOFTWARE = "software"
    NETWORK = "network"
    ACCESS = "access"
    PRINTERS = "printers"
    TELEPHONY = "telephony"
    MEDICAL_EQUIPMENT = "medical_equipment"
    OTHER = "other"


class IncidentStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationType(str, Enum):
    TICKET_CREATED = "ticket_created"
    TICKET_UPDATED = "ticket_updated"
    TICKET_ASSIGNED = "ticket_assigned"
    TICKET_RESOLVED = "ticket_resolved"
    TICKET_CLOSED = "ticket_closed"
    INCIDENT_CREATED = "incident_created"
    INCIDENT_UPDATED = "incident_updated"
    COMMENT_ADDED = "comment_added"


class AssetType(str, Enum):
    COMPUTER = "computer"
    LAPTOP = "laptop"
    PRINTER = "printer"
    SERVER = "server"
    NETWORK = "network"
    PHONE = "phone"
    MEDICAL_EQUIPMENT = "medical_equipment"
    MONITOR = "monitor"
    UPS = "ups"
    OTHER = "other"


class AssetStatus(str, Enum):
    ACTIVE = "active"
    IN_REPAIR = "in_repair"
    RETIRED = "retired"
    STOLEN = "stolen"
    MAINTENANCE = "maintenance"
