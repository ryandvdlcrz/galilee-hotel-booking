from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.html import format_html

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


def _room_occupancy(today, tomorrow):
    """Return (total_rooms, occupied_rooms) for tonight across active room types."""
    total = 0
    occupied = 0
    for rt in RoomType.objects.filter(is_active=True):
        rt_total = rt.rooms.filter(is_active=True).count()
        total += rt_total
        occupied += min(rt.rooms_booked_for_range(today, tomorrow), rt_total)
    return total, occupied


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "res_id",
        "guest_name",
        "room_type_pill",
        "stay_dates",
        "guests",
        "status_badge",
        "amount",
    )
    list_display_links = ("res_id", "guest_name")
    list_filter = ("status", "room_type", "check_in_date")
    list_per_page = 10
    list_select_related = ("room_type",)
    search_fields = ("reservation_code", "guest_name", "guest_email", "guest_phone")
    readonly_fields = ("reservation_code", "total_price", "created_at", "updated_at")
    date_hierarchy = "check_in_date"
    filter_horizontal = ("rooms",)

    STATUS_COLORS = {
        "pending": ("#92400e", "#fef3c7"),
        "confirmed": ("#166534", "#dcfce7"),
        "checked_in": ("#1e3a8a", "#dbeafe"),
        "checked_out": ("#374151", "#e5e7eb"),
        "cancelled": ("#991b1b", "#fee2e2"),
    }

    # ---- list page columns (display only) ----

    @admin.display(description="Res ID", ordering="reservation_code")
    def res_id(self, obj):
        return f"#{obj.reservation_code}"

    @admin.display(description="Room type", ordering="room_type__name")
    def room_type_pill(self, obj):
        return format_html('<span class="gm-pill">{}</span>', obj.room_type.name)

    @admin.display(description="Dates", ordering="check_in_date")
    def stay_dates(self, obj):
        fmt = "%b %d"
        if (
            obj.check_in_date.year != timezone.now().year
            or obj.check_out_date.year != obj.check_in_date.year
        ):
            fmt = "%b %d, %Y"
        return f"{obj.check_in_date.strftime(fmt)} - {obj.check_out_date.strftime(fmt)}"

    @admin.display(description="Guests", ordering="num_guests")
    def guests(self, obj):
        return obj.num_guests

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        fg, bg = self.STATUS_COLORS.get(obj.status, ("#374151", "#e5e7eb"))
        return format_html(
            '<span style="display:inline-block;padding:3px 10px;border-radius:999px;'
            'font-size:11px;font-weight:700;color:{};background:{};">{}</span>',
            fg, bg, obj.get_status_display(),
        )

    @admin.display(description="Amount", ordering="total_price")
    def amount(self, obj):
        return f"₱{obj.total_price:,.2f}"

    # ---- stat cards on top of the list page (read-only queries) ----

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        total_rooms, occupied = _room_occupancy(today, tomorrow)

        extra_context["reservation_stats"] = {
            "total": Reservation.objects.count(),
            "pending": Reservation.objects.filter(status=Reservation.Status.PENDING).count(),
            "arrivals_today": Reservation.objects.filter(
                check_in_date=today,
                status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
            ).count(),
            "occupancy": round(occupied * 100 / total_rooms) if total_rooms else 0,
        }
        return super().changelist_view(request, extra_context=extra_context)

    fieldsets = (
        ("Reservation", {
            "fields": (("reservation_code", "status"), "user")
        }),
        ("Guest details", {
            "fields": ("guest_name", ("guest_email", "guest_phone"))
        }),
        ("Booking details", {
            "fields": (
                "room_type",
                ("num_rooms", "num_guests"),
                "rooms",
                ("check_in_date", "check_out_date"),
                "special_requests",
            )
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
# Admin dashboard: summary stats, recent reservations, and per-room status
# for the Django Admin index page. See templates/admin/index.html.
# ---------------------------------------------------------------------------

_original_index = admin.site.index


def dashboard_index(request, extra_context=None):
    extra_context = extra_context or {}

    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)

    room_types = list(RoomType.objects.filter(is_active=True))

    per_room_type = []
    total_rooms = 0
    available_today = 0
    for rt in room_types:
        rt_total = rt.rooms.filter(is_active=True).count()
        rt_booked = rt.rooms_booked_for_range(today, tomorrow)
        rt_available = max(rt_total - rt_booked, 0)

        total_rooms += rt_total
        available_today += rt_available
        per_room_type.append({
            "name": rt.name,
            "total": rt_total,
            "available": rt_available,
        })

    occupied_today = total_rooms - available_today

    # Latest reservations for the "Recent Activity" card
    recent_reservations = list(
        Reservation.objects.select_related("room_type").order_by("-created_at")[:5]
    )

    # Per-room status tonight for the "Quick Room Status" card
    occupied_ids, reserved_ids = set(), set()
    tonight = Reservation.objects.filter(
        status__in=[
            Reservation.Status.PENDING,
            Reservation.Status.CONFIRMED,
            Reservation.Status.CHECKED_IN,
        ],
        check_in_date__lt=tomorrow,
        check_out_date__gt=today,
    ).prefetch_related("rooms")
    for res in tonight:
        ids = {room.id for room in res.rooms.all()}
        if res.status == Reservation.Status.CHECKED_IN:
            occupied_ids |= ids
        else:
            reserved_ids |= ids

    room_grid = []
    rooms_qs = Room.objects.filter(is_active=True, room_type__is_active=True).select_related("room_type")
    for room in rooms_qs:
        if room.id in occupied_ids:
            state = "occupied"
        elif room.id in reserved_ids:
            state = "reserved"
        else:
            state = "available"
        room_grid.append({
            "number": room.room_number,
            "type": room.room_type.name,
            "state": state,
        })

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
    extra_context["recent_reservations"] = recent_reservations
    extra_context["room_grid"] = room_grid

    return _original_index(request, extra_context)


admin.site.index = dashboard_index
admin.site.site_header = "Galilee Mansion Admin"
admin.site.site_title = "Galilee Mansion Admin"
admin.site.index_title = "Dashboard"
admin.site.site_url = "https://galilee-hotel-booking.vercel.app"