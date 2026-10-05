import re

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

# Strict check on the stored value. Used on the model fields.
ph_mobile_validator = RegexValidator(
    regex=r"^\+639\d{9}$",
    message="Enter a PH mobile number in the format +639XXXXXXXXX.",
)


def normalize_ph_mobile(value):
    """Accepts 9171234567, 09171234567, +639171234567, or with spaces/dashes.
    Returns +639XXXXXXXXX, or raises a ValidationError."""
    digits = re.sub(r"\D", "", value or "")
    if digits.startswith("63"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"9\d{9}", digits):
        raise ValidationError(
            "Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567)."
        )
    return f"+63{digits}"