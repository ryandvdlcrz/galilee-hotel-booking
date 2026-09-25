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
        help_text="Maximum guests included in the base price, per room of this type. "
                   "Extra guests beyond this are billed at 'extra_pax_fee' each, per night."
    )
    extra_pax_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Charge per additional guest, per night, beyond the base capacity. "
                   "Leave as 0 if this room type doesn't allow extra guests for a fee."
    )
    bed_configuration = models.CharField(
        max_length=150, blank=True,
        help_text="e.g. '1 Queen Bed, 2 Single Beds' — shown to customers on the room detail page.",
    )
    total_rooms = models.PositiveIntegerField(
        help_text="Total number of rooms of this type available at the hotel."
    )
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

    def available_rooms_list(self, check_in, check_out, exclude_reservation_id=None):
        """Return the queryset of specific Room instances of this type
        that are free for the given date range."""
        booked_room_ids = Reservation.objects.filter(
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
            booked_room_ids = booked_room_ids.exclude(pk=exclude_reservation_id)

        booked_room_ids = booked_room_ids.values_list("rooms__id", flat=True)

        return self.rooms.filter(is_active=True).exclude(id__in=booked_room_ids)

class Room(models.Model):
    """An individual physical room belonging to a RoomType.
    Used to assign specific room numbers to reservations."""

    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name="rooms")
    room_number = models.CharField(max_length=20)
    is_active = models.BooleanField(
        default=True, help_text="Uncheck to remove this room from booking without deleting its history."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["room_type", "room_number"]
        unique_together = ["room_type", "room_number"]

    def __str__(self):
        return f"{self.room_type.name} — Room {self.room_number}"

    def is_available_for_range(self, check_in, check_out, exclude_reservation_id=None):
        """Check if this specific room is free for the given date range."""
        overlapping = self.reservations.filter(
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
        return not overlapping.exists()

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
    rooms = models.ManyToManyField(
        Room, blank=True, related_name="reservations",
        help_text="Specific room(s) assigned to this reservation, matching num_rooms in count"
    )
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

    def clean_dates_and_quantity(self):
        """Checks that don't require a saved isntance (no M2M queries).
        Safe to call before the reservation has a pk."""
        errors = {}
        if self.check_in_date and self.check_out_date:
            if self.check_out_date <= self.check_in_date:
                errors["check_out_date"] = "Check-out date must be after check in date."
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

    def clean_rooms(self):
         """Checks that require a saved instance, since self.rooms is M2M.
         Only call this after the reservation has a pk."""
         errors = {}
         if self.pk and self.check_in_date and self.check_out_date:
             selected_rooms = self.rooms.all()
             if selected_rooms.count() != self.num_rooms:
                 errors["rooms"] = (
                     f"You selected {selected_rooms.count()} room(s) but num_rooms is {self.num_rooms}. "
                     "These must match."
                 )
             for room in selected_rooms:
                 if room.room_type_id != self.room_type_id:
                     errors["rooms"] = f"Room {room.room_number} does not belong to the selected room type."
                 elif not room.is_available_for_range(self.check_in_date, self.check_out_date, exclude_reservation_id=self.pk):
                     errors.setdefault("rooms", f"Room {room.room_number} is no longer available for these dates.")
         if errors:
          raise ValidationError(errors)

    def clean(self):
        """Full verification - called by Django Admin (ModelForm) after save."""
        self.clean_dates_and_quantity()
        self.clean_rooms()
                
    def _generate_code(self):
        return uuid.uuid4().hex[:8].upper()

    def base_room_cost(self):
        """Room rate only, before any extra-guest fees."""
        nights = (self.check_out_date - self.check_in_date).days
        return (self.room_type.price_per_night * self.num_rooms * nights).quantize(Decimal("0.01"))

    def extra_guest_count(self):
        """How many guests exceed the room type's included base capacity."""
        included = self.room_type.capacity * self.num_rooms
        return max(self.num_guests - included, 0)

    def extra_guest_fee_total(self):
        """Extra-guest charge: per additional guest, per night."""
        nights = (self.check_out_date - self.check_in_date).days
        extra_guests = self.extra_guest_count()
        return (self.room_type.extra_pax_fee * extra_guests * nights).quantize(Decimal("0.01"))

    def _calculate_total_price(self):
        return self.base_room_cost() + self.extra_guest_fee_total()

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