from typing import Annotated

from pydantic import StringConstraints

# Plain shape check, not full RFC/deliverability validation — this is an internal
# single-tenant system and the spec's own seed data uses reserved-TLD addresses
# like admin@company.local, which strict email-validator (EmailStr) rejects.
EmailField = Annotated[str, StringConstraints(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
