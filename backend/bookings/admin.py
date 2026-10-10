from datetime import timedelta

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from django.utils.html import format_html, format_html_join

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
    list_display = ("amenity_name", "icon_tag", "used_in")
    list_display_links = ("amenity_name",)
    list_per_page = 20
    search_fields = ("name",)

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .annotate(room_type_count=Count("room_types", distinct=True))
            .prefetch_related("room_types")
        )

    # ---- list page columns (display only) ----

    @admin.display(description="Amenity", ordering="name")
    def amenity_name(self, obj):
        return format_html(
            '<div class="gm-am"><span class="gm-am-badge">{}</span><strong>{}</strong></div>',
            obj.name[:1].upper(), obj.name,
        )

    @admin.display(description="Icon", ordering="icon")
    def icon_tag(self, obj):
        if obj.icon:
            return format_html('<span class="gm-tag">{}</span>', obj.icon)
        return format_html('<span class="gm-muted">{}</span>', "No icon")

    @admin.display(description="Used in", ordering="room_type_count")
    def used_in(self, obj):
        types = list(obj.room_types.all())
        if not types:
            return format_html('<span class="gm-tag gm-tag-off">{}</span>', "Not used")
        shown = types[:3]
        pills = format_html_join("", '<span class="gm-pill">{}</span>', ((t.name,) for t in shown))
        extra = len(types) - len(shown)
        if extra > 0:
            return format_html('{}<span class="gm-pill gm-pill-more">+{}</span>', pills, extra)
        return pills

    # ---- stat cards on top of the list page (read-only queries) ----

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        amenities = Amenity.objects.annotate(room_type_count=Count("room_types", distinct=True))
        total = amenities.count()
        in_use = amenities.filter(room_type_count__gt=0).count()
        extra_context["amenity_stats"] = {
            "total": total,
            "in_use": in_use,
            "unused": total - in_use,
        }
        return super().changelist_view(request, extra_context=extra_context)


class RoomImageInline(admin.TabularInline):
    """Lets staff add/manage images directly from the RoomType edit page."""
    model = RoomImage
    extra = 1


class RoomInLine(admin.TabularInline):
    """Let staff add/manage individual room numbers directly from the RoomType edit page."""
    model = Room
    extra = 1


def _with_room_counts(qs):
    """Annotate room types with how many Room records they have (all / active)."""
    return qs.annotate(
        rooms_total=Count("rooms", distinct=True),
        rooms_active=Count("rooms", filter=Q(rooms__is_active=True), distinct=True),
    )


def _bookable(rt):
    """Rooms customers can book for an annotated RoomType (mirrors RoomType.bookable_rooms)."""
    return rt.rooms_active if rt.rooms_total else rt.total_rooms


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ("type_card", "price_night", "guest_capacity", "rooms_count", "visibility")
    list_display_links = ("type_card",)
    list_filter = ("is_active",)
    list_per_page = 10
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("amenities",)
    inlines = [RoomImageInline, RoomInLine]

    def get_queryset(self, request):
        return _with_room_counts(super().get_queryset(request)).prefetch_related("images")

    # ---- list page columns (display only) ----

    @admin.display(description="Room type", ordering="name")
    def type_card(self, obj):
        images = list(obj.images.all())
        if images and images[0].image:
            thumb = format_html(
                '<img class="gm-rt-thumb" src="{}" alt="" loading="lazy">', images[0].image.url
            )
        else:
            thumb = format_html('<div class="gm-rt-noimg">{}</div>', obj.name[:1].upper())
        beds = format_html("<small>{}</small>", obj.bed_configuration) if obj.bed_configuration else ""
        return format_html(
            '<div class="gm-rt">{}<div><strong>{}</strong>{}</div></div>', thumb, obj.name, beds
        )

    @admin.display(description="Price", ordering="price_per_night")
    def price_night(self, obj):
        amount = f"{obj.price_per_night:,.2f}".removesuffix(".00")
        return format_html(
            '<span class="gm-gold">₱{}</span><span class="gm-cell-sub">per night</span>', amount
        )

    @admin.display(description="Capacity", ordering="capacity")
    def guest_capacity(self, obj):
        sub = ""
        if obj.extra_pax_fee:
            fee = f"{obj.extra_pax_fee:,.2f}".removesuffix(".00")
            sub = format_html('<span class="gm-cell-sub">Extra guest ₱{}/night</span>', fee)
        return format_html("{} guest{}{}", obj.capacity, "" if obj.capacity == 1 else "s", sub)

    @admin.display(description="Rooms", ordering="rooms_active")
    def rooms_count(self, obj):
        if obj.rooms_total == 0:
            return format_html(
                '{}<span class="gm-cell-sub">No room numbers yet</span>', obj.total_rooms
            )
        return format_html(
            '{} active<span class="gm-cell-sub">of {} room{}</span>',
            obj.rooms_active, obj.rooms_total, "" if obj.rooms_total == 1 else "s",
        )

    @admin.display(description="Status", ordering="is_active")
    def visibility(self, obj):
        if obj.is_active:
            return format_html('<span class="gm-badge gm-badge-visible">{}</span>', "Visible")
        return format_html('<span class="gm-badge gm-badge-hidden">{}</span>', "Hidden")

    # ---- stat cards on top of the list page (read-only queries) ----

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        types = list(_with_room_counts(RoomType.objects.all()))
        active = [t for t in types if t.is_active]
        extra_context["roomtype_stats"] = {
            "total": len(types),
            "visible": len(active),
            "hidden": len(types) - len(active),
            "rooms": sum(_bookable(t) for t in active),
        }
        return super().changelist_view(request, extra_context=extra_context)


class RoomStatusForm(forms.ModelForm):
    """Used only for the quick-edit dropdown on the Rooms list page."""
    is_active = forms.BooleanField(
        required=False,
        widget=forms.Select(choices=[(True, "Active"), (False, "Under maintenance")]),
    )

    class Meta:
        model = Room
        fields = ("is_active",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "photo", "status_tonight", "type_name", "specs", "price", "is_active")
    list_display_links = ("room_number",)
    list_editable = ("is_active",)
    list_filter = ("room_type", "is_active")
    list_per_page = 12
    search_fields = ("room_number",)

    def get_changelist_form(self, request, **kwargs):
        kwargs.setdefault("form", RoomStatusForm)
        return super().get_changelist_form(request, **kwargs)

    def get_queryset(self, request):
        """Annotate each room with tonight's occupancy so the list can show a live status."""
        qs = (
            super().get_queryset(request)
            .select_related("room_type")
            .prefetch_related("room_type__images")
        )
        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)
        tonight = Reservation.objects.filter(
            rooms=OuterRef("pk"),
            check_in_date__lt=tomorrow,
            check_out_date__gt=today,
        )
        return qs.annotate(
            tonight_occupied=Exists(tonight.filter(status=Reservation.Status.CHECKED_IN)),
            tonight_reserved=Exists(
                tonight.filter(status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED])
            ),
        )

    # ---- card fields (display only) ----

    @admin.display(description="Photo")
    def photo(self, obj):
        images = list(obj.room_type.images.all())
        if images and images[0].image:
            return format_html(
                '<img src="{}" alt="{}" loading="lazy">', images[0].image.url, obj.room_type.name
            )
        return format_html('<div class="gm-noimg">{}</div>', "No photo")

    @admin.display(description="Status")
    def status_tonight(self, obj):
        if not obj.is_active:
            key, label = "maintenance", "Maintenance"
        elif obj.tonight_occupied:
            key, label = "occupied", "Occupied"
        elif obj.tonight_reserved:
            key, label = "reserved", "Reserved"
        else:
            key, label = "available", "Available"
        return format_html('<span class="gm-badge gm-badge-{}">{}</span>', key, label)

    @admin.display(description="Room type", ordering="room_type__name")
    def type_name(self, obj):
        return obj.room_type.name

    @admin.display(description="Details")
    def specs(self, obj):
        rt = obj.room_type
        parts = [format_html('<span class="gm-spec gm-spec-guests">{} Max</span>', rt.capacity)]
        if rt.bed_configuration:
            parts.append(format_html('<span class="gm-spec gm-spec-bed">{}</span>', rt.bed_configuration))
        return format_html_join("", "{}", ((p,) for p in parts))

    @admin.display(description="Price", ordering="room_type__price_per_night")
    def price(self, obj):
        amount = f"{obj.room_type.price_per_night:,.2f}"
        if amount.endswith(".00"):
            amount = amount[:-3]
        return format_html("<strong>₱{}</strong> <small>/night</small>", amount)

    # ---- stat cards on top of the list page (read-only queries) ----

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        rooms = self.get_queryset(request)
        active = rooms.filter(is_active=True)
        extra_context["room_stats"] = {
            "total": rooms.count(),
            "available": active.filter(tonight_occupied=False, tonight_reserved=False).count(),
            "reserved": active.filter(tonight_occupied=False, tonight_reserved=True).count(),
            "occupied": active.filter(tonight_occupied=True).count(),
            "maintenance": rooms.filter(is_active=False).count(),
        }
        return super().changelist_view(request, extra_context=extra_context)


class PromoQuickForm(forms.ModelForm):
    """Quick-edit fields shown on each promo card (Promos list page only)."""
    is_active = forms.BooleanField(
        required=False,
        widget=forms.Select(choices=[(True, "Active"), (False, "Hidden")]),
    )

    class Meta:
        model = Promo
        fields = ("is_active", "display_order")


@admin.register(Promo)
class PromoAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "display_order", "created_at")
    list_editable = ("is_active", "display_order")
    list_filter = ("is_active",)
    list_per_page = 50
    search_fields = ("title",)

    def get_changelist_form(self, request, **kwargs):
        kwargs.setdefault("form", PromoQuickForm)
        return super().get_changelist_form(request, **kwargs)

    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context=extra_context)

        # Split the promos on this page into Active and Hidden for the card layout.
        context = getattr(response, "context_data", None)
        if context and "cl" in context:
            cl = context["cl"]
            if cl.formset:
                items = [{"promo": f.instance, "form": f} for f in cl.formset.forms]
            else:
                items = [{"promo": p, "form": None} for p in cl.result_list]
            context["promo_active"] = [i for i in items if i["promo"].is_active]
            context["promo_hidden"] = [i for i in items if not i["promo"].is_active]
        return response


def _room_occupancy(today, tomorrow):
    """Return (total_rooms, occupied_rooms) for tonight across active room types."""
    total = 0
    occupied = 0
    for rt in RoomType.objects.filter(is_active=True):
        rt_total = rt.bookable_rooms
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

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """Room picker: active rooms only, plus any room already assigned to this reservation."""
        if db_field.name == "rooms":
            rooms = Room.objects.filter(is_active=True)
            object_id = request.resolver_match.kwargs.get("object_id")
            if object_id:
                rooms = Room.objects.filter(Q(is_active=True) | Q(reservations__pk=object_id))
            kwargs["queryset"] = rooms.select_related("room_type").distinct()
        return super().formfield_for_manytomany(db_field, request, **kwargs)

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
        rt_total = rt.bookable_rooms
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