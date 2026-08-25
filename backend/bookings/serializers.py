from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Amenity, RoomType, RoomImage, Reservation, Promo, UserProfile


class PromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promo
        fields = ["id", "title", "image", "link_url", "display_order"]


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["id", "name", "icon"]


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ["id", "image", "caption", "is_primary"]


class RoomTypeSerializer(serializers.ModelSerializer):
    amenities = AmenitySerializer(many=True, read_only=True)
    images = RoomImageSerializer(many=True, read_only=True)
    available_rooms = serializers.SerializerMethodField()

    class Meta:
        model = RoomType
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "price_per_night",
            "capacity",
            "extra_pax_fee",
            "bed_configuration",
            "total_rooms",
            "size_sqm",
            "amenities",
            "images",
            "is_active",
            "available_rooms",
        ]

    def get_available_rooms(self, obj):
        """Only computed when check_in/check_out are passed as query params
        (e.g. /api/room-types/?check_in=2026-08-20&check_out=2026-08-22).
        Falls back to total_rooms if no dates were given."""
        request = self.context.get("request")
        if not request:
            return obj.total_rooms

        check_in = request.query_params.get("check_in")
        check_out = request.query_params.get("check_out")
        if check_in and check_out:
            return obj.available_rooms_for_range(check_in, check_out)
        return obj.total_rooms


class ReservationSerializer(serializers.ModelSerializer):
    """Used for creating a reservation and for showing it back to the user.
    total_price, status, and reservation_code are set by the server, never
    the client."""

    room_type_name = serializers.CharField(source="room_type.name", read_only=True)
    base_room_cost = serializers.SerializerMethodField()
    extra_guest_count = serializers.SerializerMethodField()
    extra_guest_fee_total = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "reservation_code",
            "room_type",
            "room_type_name",
            "guest_name",
            "guest_email",
            "guest_phone",
            "num_rooms",
            "num_guests",
            "check_in_date",
            "check_out_date",
            "status",
            "total_price",
            "base_room_cost",
            "extra_guest_count",
            "extra_guest_fee_total",
            "special_requests",
            "created_at",
        ]
        read_only_fields = ["reservation_code", "status", "total_price", "created_at"]

    def get_base_room_cost(self, obj):
        return obj.base_room_cost()

    def get_extra_guest_count(self, obj):
        return obj.extra_guest_count()

    def get_extra_guest_fee_total(self, obj):
        return obj.extra_guest_fee_total()

    def validate(self, attrs):
        # Reuses the same validation logic defined on the model (date order +
        # availability), so the API and Django Admin never fall out of sync.
        instance = Reservation(**attrs)
        instance.clean()
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["user"] = request.user
        return super().create(validated_data)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        UserProfile.objects.create(user=user, phone=validated_data.get("phone", ""))
        return user


class UserSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="profile.phone", read_only=True, default="")

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone"]