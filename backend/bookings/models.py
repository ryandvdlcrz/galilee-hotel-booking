"""
Hotel Booking Appointment System — Core Models
Single hotel, room-type-based inventory, guest + registered-user bookings.
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class UserProfile(models.Model):
    """Extra fields for registered users beyond Django's default User model.
    One-to-one — every User optionally has one UserProfile."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile for {self.user.email or self.user.username}"


class Amenity(models.Model):
    """Reusable feature tags, e.g. WiFi, Air Conditioning, Breakfast Included."""

    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional icon identifier (e.g. lucide-react icon name) for the frontend.",
    )

    class Meta:
        verbose_name_plural = "Amenities"
        ordering = ["name"]

    def __str__(self):
        return self.name


class RoomType(models.Model):
    """A category of room (e.g. 'Deluxe Double') with a fixed inventory count.

    Availability is tracked by quantity rather than individually numbered rooms,
    per project requirements.
    """

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    capacity = models.PositiveIntegerField(
        help_text="Maximum number of guests per room of this type."
    )
    total_rooms = models.PositiveIntegerField(
        help_text="Total number of rooms of this type available at the hotel."
    )
    size_sqm = models.PositiveIntegerField(blank=True, null=True)
    amenities = models.ManyToManyField(Amenity, blank=True, related_name="room_types")
    is_active = models.BooleanField(
        default=True, help_text="Uncheck to hide this room type from customers without deleting it."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def rooms_booked_for_range(self, check_in, check_out, exclude_reservation_id=None):
        """Sum of rooms of this type already reserved for any date overlapping the given range."""
        overlapping = Reservation.objects.filter(
            room_type=self,
            status__in=[
                Reservation.Status.PENDING,
                Reservation.Status.CONFIRMED,
                Reservation.Status.CHECKED_IN,
            ],
            check_in_date__lt=check_out,
            check_out_date__gt=check_in,
        )
        if exclude_reservation_id:
            overlapping = overlapping.exclude(pk=exclude_reservation_id)
        return overlapping.aggregate(total=models.Sum("num_rooms"))["total"] or 0

    def available_rooms_for_range(self, check_in, check_out, exclude_reservation_id=None):
        booked = self.rooms_booked_for_range(check_in, check_out, exclude_reservation_id)
        return max(self.total_rooms - booked, 0)


class RoomImage(models.Model):
    """Gallery images for a room type (customer-facing room details page)."""

    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="room_images/")
    caption = models.CharField(max_length=150, blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "id"]

    def __str__(self):
        return f"Image for {self.room_type.name}"


class Promo(models.Model):
    """A promotional banner staff can manage from Django Admin.

    Displayed in a responsive grid on the homepage — the frontend adapts
    the layout automatically whether there's 1 promo or several, so staff
    don't need to keep the count at exactly 2.
    """

    title = models.CharField(
        max_length=150,
        help_text="Shown as alt text and as a fallback label if no image is uploaded yet.",
    )
    image = models.ImageField(upload_to="promos/", blank=True, null=True)
    link_url = models.URLField(
        blank=True,
        help_text="Optional — where the promo should link to when clicked (e.g. an offers page or Facebook post).",
    )
    is_active = models.BooleanField(
        default=True, help_text="Uncheck to hide this promo from the homepage without deleting it."
    )
    display_order = models.PositiveIntegerField(
        default=0, help_text="Lower numbers show first. Promos with the same number are sorted by newest."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.title


class Reservation(models.Model):
    """A booking for one or more rooms of a given RoomType.

    Supports both guest checkout (no account) and bookings made by an
    authenticated user. Guest contact fields are always stored on the
    reservation itself so staff have a record even if the user account
    is later deleted.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CHECKED_IN = "checked_in", "Checked In"
        CHECKED_OUT = "checked_out", "Checked Out"
        CANCELLED = "cancelled", "Cancelled"

    reservation_code = models.CharField(max_length=12, unique=True, editable=False)

    # Optional link to a registered account. Null = guest booking.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )

    # Contact details — always filled, whether guest or registered user.
    guest_name = models.CharField(max_length=150)
    guest_email = models.EmailField()
    guest_phone = models.CharField(max_length=30)

    room_type = models.ForeignKey(RoomType, on_delete=models.PROTECT, related_name="reservations")
    num_rooms = models.PositiveIntegerField(default=1)
    num_guests = models.PositiveIntegerField(default=1)

    check_in_date = models.DateField()
    check_out_date = models.DateField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    special_requests = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["check_in_date", "check_out_date"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.reservation_code} — {self.guest_name} ({self.room_type})"

    def clean(self):
        errors = {}
        if self.check_in_date and self.check_out_date:
            if self.check_out_date <= self.check_in_date:
                errors["check_out_date"] = "Check-out date must be after check-in date."
        if self.room_type_id and self.check_in_date and self.check_out_date and self.num_rooms:
            available = self.room_type.available_rooms_for_range(
                self.check_in_date, self.check_out_date, exclude_reservation_id=self.pk
            )
            if self.num_rooms > available:
                errors["num_rooms"] = (
                    f"Only {available} room(s) of this type are available for the selected dates."
                )
        if errors:
            raise ValidationError(errors)

    def _generate_code(self):
        return uuid.uuid4().hex[:8].upper()

    def _calculate_total_price(self):
        nights = (self.check_out_date - self.check_in_date).days
        return (self.room_type.price_per_night * self.num_rooms * nights).quantize(Decimal("0.01"))

    def save(self, *args, **kwargs):
        if not self.reservation_code:
            code = self._generate_code()
            while Reservation.objects.filter(reservation_code=code).exists():
                code = self._generate_code()
            self.reservation_code = code

        if self.room_type_id and self.check_in_date and self.check_out_date:
            self.total_price = self._calculate_total_price()

        super().save(*args, **kwargs)

    @property
    def nights(self):
        if self.check_in_date and self.check_out_date:
            return (self.check_out_date - self.check_in_date).days
        return 0

    @property
    def is_upcoming(self):
        return self.check_in_date >= timezone.now().date() and self.status in [
            self.Status.PENDING,
            self.Status.CONFIRMED,
        ]