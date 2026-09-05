import enum


class UserRole(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    HR = "HR"
    ADMIN = "ADMIN"


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    INTERN = "intern"
    CONTRACT = "contract"


class WorkLocation(str, enum.Enum):
    OFFICE = "office"
    REMOTE = "remote"
    HYBRID = "hybrid"


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_NOTICE = "on_notice"
    EXITED = "exited"


class AttendanceSource(str, enum.Enum):
    WEB = "web"
    MOBILE = "mobile"


class DirectionHint(str, enum.Enum):
    IN = "in"
    OUT = "out"
    UNKNOWN = "unknown"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"
    HOLIDAY = "holiday"
    WEEKLY_OFF = "weekly_off"
    PENDING = "pending"


class LeaveAccrual(str, enum.Enum):
    YEARLY = "yearly"
    MONTHLY = "monthly"


class HalfDaySession(str, enum.Enum):
    FIRST = "first"
    SECOND = "second"


class LeaveRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class RegularisationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
