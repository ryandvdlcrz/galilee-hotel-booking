from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Amenity, RoomType, RoomImage, Room, Reservation, Promo, UserProfile


class UserProfileInline(admin.StackedInline):
    """Shows phone number directly on the User edit page in Django Admin."""
    model = UserProfile
    can_delete = False
    extra = 0


class CustomUserAdmin(UserAdmin):
    inlines = [UserProfileInline]


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


class RoomImageInline(admin.TabularInline):
    """Lets staff add/manage images directly from the RoomType edit page."""
    model = RoomImage
    extra = 1

class RoomInLine(admin.TabularInline):
    """Let staff add/manage individual room numbers directly from the RoomType edit page."""
    model = Room
    extra = 1

@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "price_per_night", "capacity", "extra_pax_fee", "total_rooms", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("amenities",)
    inlines = [RoomImageInline, RoomInLine]

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "room_type", "is_active")
    list_filter = ("room_type", "is_active")
    search_fields = ("room_number",)

@admin.register(Promo)
class PromoAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "display_order", "created_at")
    list_editable = ("is_active", "display_order")
    list_filter = ("is_active",)
    search_fields = ("title",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "reservation_code",
        "guest_name",
        "room_type",
        "check_in_date",
        "check_out_date",
        "num_rooms",
        "status",
        "total_price",
    )
    list_filter = ("status", "room_type")
    search_fields = ("reservation_code", "guest_name", "guest_email", "guest_phone")
    readonly_fields = ("reservation_code", "total_price", "created_at", "updated_at")
    date_hierarchy = "check_in_date"

    fieldsets = (
        ("Reservation", {
            "fields": ("reservation_code", "status", "user")
        }),
        ("Guest details", {
            "fields": ("guest_name", "guest_email", "guest_phone")
        }),
        ("Booking details", {
            "fields": ("room_type", "num_rooms", "num_guests", "check_in_date", "check_out_date", "special_requests")
        }),
        ("Pricing", {
            "fields": ("total_price",)
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


# ---------------------------------------------------------------------------
# Admin dashboard — adds summary stats to the top of the Django Admin
# index page (checked-in guests, room availability today, etc).
# See backend/templates/admin/index.html for the template that renders this.
# ---------------------------------------------------------------------------

from datetime import timedelta
from django.utils import timezone

_original_index = admin.site.index


def dashboard_index(request, extra_context=None):
    extra_context = extra_context or {}

    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)

    room_types = list(RoomType.objects.filter(is_active=True))
    total_rooms = sum(rt.total_rooms for rt in room_types)
    available_today = sum(rt.available_rooms_for_range(today, tomorrow) for rt in room_types)
    occupied_today = total_rooms - available_today

    per_room_type = [
        {
            "name": rt.name,
            "total": rt.total_rooms,
            "available": rt.available_rooms_for_range(today, tomorrow),
        }
        for rt in room_types
    ]

    extra_context["dashboard_stats"] = {
        "checked_in": Reservation.objects.filter(status=Reservation.Status.CHECKED_IN).count(),
        "pending": Reservation.objects.filter(status=Reservation.Status.PENDING).count(),
        "confirmed": Reservation.objects.filter(status=Reservation.Status.CONFIRMED).count(),
        "checkins_today": Reservation.objects.filter(
            check_in_date=today, status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED]
        ).count(),
        "checkouts_today": Reservation.objects.filter(
            check_out_date=today, status=Reservation.Status.CHECKED_IN
        ).count(),
        "total_rooms": total_rooms,
        "available_today": available_today,
        "occupied_today": occupied_today,
        "per_room_type": per_room_type,
    }

    return _original_index(request, extra_context)


admin.site.index = dashboard_index
admin.site.site_header = "Galilee Mansion Admin"
admin.site.site_title = "Galilee Mansion Admin"
admin.site.index_title = "Dashboard"