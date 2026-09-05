from fastapi import APIRouter

from app.api.v1.attendance import router as attendance_router
from app.api.v1.auth import router as auth_router
from app.api.v1.config import departments_router, designations_router, shifts_router
from app.api.v1.employees import router as employees_router
from app.api.v1.leave import leave_router, leave_types_router
from app.api.v1.me import router as me_router
from app.api.v1.regularisations import router as regularisations_router
from app.api.v1.reports import router as reports_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth_router)
api_router.include_router(me_router)
api_router.include_router(employees_router)
api_router.include_router(attendance_router)
api_router.include_router(leave_router)
api_router.include_router(leave_types_router)
api_router.include_router(regularisations_router)
api_router.include_router(reports_router)
api_router.include_router(designations_router)
api_router.include_router(departments_router)
api_router.include_router(shifts_router)
