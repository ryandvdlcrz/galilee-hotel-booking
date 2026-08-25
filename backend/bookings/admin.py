from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Amenity, RoomType, RoomImage, Reservation, Promo, UserProfile


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


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "price_per_night", "capacity", "extra_pax_fee", "total_rooms", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("amenities",)
    inlines = [RoomImageInline]


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