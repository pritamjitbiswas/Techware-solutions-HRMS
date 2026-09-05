"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-06

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "designations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("level", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("grace_in_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("grace_out_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("break_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("full_day_minutes", sa.Integer(), nullable=False),
        sa.Column("half_day_minutes", sa.Integer(), nullable=False),
        sa.Column("crosses_midnight", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "weekly_offs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
    )

    op.create_table(
        "holidays",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("is_optional", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    employment_type_enum = sa.Enum(
        "full_time", "part_time", "intern", "contract", name="employment_type"
    )
    work_location_enum = sa.Enum("office", "remote", "hybrid", name="work_location")
    employment_status_enum = sa.Enum("active", "on_notice", "exited", name="employment_status")

    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_code", sa.String(30), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("official_email", sa.String(150), nullable=False),
        sa.Column("date_of_joining", sa.Date(), nullable=False),
        sa.Column("designation_id", sa.Integer(), sa.ForeignKey("designations.id"), nullable=True),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("reporting_manager_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("employment_type", employment_type_enum, nullable=False),
        sa.Column("shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=True),
        sa.Column("work_location", work_location_enum, nullable=False),
        sa.Column(
            "employment_status",
            employment_status_enum,
            nullable=False,
            server_default="active",
        ),
        sa.Column("date_of_exit", sa.Date(), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("personal_mobile", sa.String(20), nullable=True),
        sa.Column("personal_email", sa.String(150), nullable=True),
        sa.Column("current_address", sa.String(500), nullable=True),
        sa.Column("permanent_address", sa.String(500), nullable=True),
        sa.Column("emergency_contact_name", sa.String(150), nullable=True),
        sa.Column("emergency_contact_number", sa.String(20), nullable=True),
        sa.Column("emergency_contact_relation", sa.String(50), nullable=True),
        sa.Column("blood_group", sa.String(5), nullable=True),
        sa.Column("profile_picture_key", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("employee_code"),
        sa.UniqueConstraint("official_email"),
    )

    user_role_enum = sa.Enum("EMPLOYEE", "MANAGER", "HR", "ADMIN", name="user_role")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("employee_id"),
    )

    op.create_table(
        "employee_finance",
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), primary_key=True),
        sa.Column("ctc_annual", sa.Numeric(14, 2), nullable=True),
        sa.Column("pan_number", sa.String(10), nullable=True),
        sa.Column("pf_uan", sa.String(20), nullable=True),
        sa.Column("bank_account_number", sa.String(30), nullable=True),
        sa.Column("bank_ifsc", sa.String(11), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.UniqueConstraint("token_hash"),
    )

    attendance_source_enum = sa.Enum("web", "mobile", name="attendance_source")
    direction_hint_enum = sa.Enum("in", "out", "unknown", name="direction_hint")

    op.create_table(
        "attendance_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("punch_time_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", attendance_source_enum, nullable=False),
        sa.Column("direction_hint", direction_hint_enum, nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("accuracy_metres", sa.Float(), nullable=True),
        sa.Column("is_mock_location", sa.Boolean(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("client_punch_id", sa.String(36), nullable=True),
        sa.Column(
            "server_received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("client_punch_id"),
    )
    op.create_index("ix_attendance_logs_employee_id", "attendance_logs", ["employee_id"])
    op.create_index("ix_attendance_logs_punch_time_utc", "attendance_logs", ["punch_time_utc"])

    attendance_status_enum = sa.Enum(
        "present", "absent", "half_day", "on_leave", "holiday", "weekly_off", "pending",
        name="attendance_status",
    )

    op.create_table(
        "attendance_daily",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=True),
        sa.Column("first_in_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_out_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("worked_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("break_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overtime_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("late_by_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("early_out_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", attendance_status_enum, nullable=False),
        sa.Column("is_manual_override", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("override_reason", sa.String(500), nullable=True),
        sa.Column("override_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("employee_id", "work_date", name="uq_attendance_daily_employee_date"),
    )

    leave_accrual_enum = sa.Enum("yearly", "monthly", name="leave_accrual")

    op.create_table(
        "leave_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("annual_quota", sa.Integer(), nullable=False),
        sa.Column("accrual", leave_accrual_enum, nullable=False),
        sa.Column("carry_forward_max", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_paid", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("requires_document", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "leave_balances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("leave_type_id", sa.Integer(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("opening", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("accrued", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("used", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("pending", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("closing", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.UniqueConstraint(
            "employee_id", "leave_type_id", "year", name="uq_leave_balance_employee_type_year"
        ),
    )

    half_day_session_enum = sa.Enum("first", "second", name="half_day_session")
    leave_request_status_enum = sa.Enum(
        "pending", "approved", "rejected", "cancelled", name="leave_request_status"
    )

    op.create_table(
        "leave_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("leave_type_id", sa.Integer(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("from_date", sa.Date(), nullable=False),
        sa.Column("to_date", sa.Date(), nullable=False),
        sa.Column("is_half_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("half_day_session", half_day_session_enum, nullable=True),
        sa.Column("total_days", sa.Numeric(5, 2), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("status", leave_request_status_enum, nullable=False, server_default="pending"),
        sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approver_comment", sa.String(500), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actioned_at", sa.DateTime(timezone=True), nullable=True),
    )

    regularisation_status_enum = sa.Enum(
        "pending", "approved", "rejected", name="regularisation_status"
    )

    op.create_table(
        "regularisation_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("requested_in_time", sa.Time(), nullable=True),
        sa.Column("requested_out_time", sa.Time(), nullable=True),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("status", regularisation_status_enum, nullable=False, server_default="pending"),
        sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approver_comment", sa.String(500), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actioned_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("before_json", sa.JSON(), nullable=True),
        sa.Column("after_json", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("regularisation_requests")
    op.drop_table("leave_requests")
    op.drop_table("leave_balances")
    op.drop_table("leave_types")
    op.drop_table("attendance_daily")
    op.drop_table("attendance_logs")
    op.drop_table("refresh_tokens")
    op.drop_table("employee_finance")
    op.drop_table("users")
    op.drop_table("employees")
    op.drop_table("holidays")
    op.drop_table("weekly_offs")
    op.drop_table("shifts")
    op.drop_table("designations")
    op.drop_table("departments")

    for enum_name in (
        "regularisation_status",
        "leave_request_status",
        "half_day_session",
        "leave_accrual",
        "attendance_status",
        "direction_hint",
        "attendance_source",
        "user_role",
        "employment_status",
        "work_location",
        "employment_type",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
