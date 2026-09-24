from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Amenity, RoomType, RoomImage, Reservation, Room, Promo, UserProfile


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

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["id", "room_number"]


class RoomTypeSerializer(serializers.ModelSerializer):
    amenities = AmenitySerializer(many=True, read_only=True)
    images = RoomImageSerializer(many=True, read_only=True)
    available_rooms = serializers.SerializerMethodField()
    available_room_numbers = serializers.SerializerMethodField() 

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
            "available_room_numbers",
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

    def get_available_room_numbers(self,obj):
        """Only populated when check_in/check_out are passed as query params.
        Used on RoomDetailPage so the guest can pick specific room numbers."""
        request = self.context.get("request")
        if not request:
            return []

        check_in = request.query_params.get("check_in")
        check_out = request.query_params.get("check_out")
        if check_in and check_out:
            rooms = obj.available_rooms_list(check_in, check_out)
            return RoomSerializer(rooms, many=True).data
        return []

class ReservationSerializer(serializers.ModelSerializer):
    """Used for creating a reservation and for showing it back to the user.
    total_price, status, and reservation_code are set by the server, never
    the client."""

    room_type_name = serializers.CharField(source="room_type.name", read_only=True)
    base_room_cost = serializers.SerializerMethodField()
    extra_guest_count = serializers.SerializerMethodField()
    extra_guest_fee_total = serializers.SerializerMethodField()
    room_ids = serializers.PrimaryKeyRelatedField(
        queryset =Room.objects.all(), many=True, write_only=True, required=False,
        help_text = "IDs of the specific rooms the guest selected. Count must match num_rooms."
    )
    rooms = RoomSerializer(many=True, read_only=True)

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
            "room_ids",
            "rooms"
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
        room_ids = attrs.get("room_ids", [])
        num_rooms = attrs.get("num_rooms", 1)

        if room_ids and len(room_ids) != num_rooms:
            raise serializers.ValidationError(
                {"room_ids": f"You selected {len(room_ids)} room(s) but num_rooms is {num_rooms}. These must match."}
            )

        room_type = attrs.get("room_type")
        for room in room_ids:
            if room.room_type_id != room_type.id:
                raise serializers.ValidationError(
                    {"room_ids" f"Room {room.room_number} does not belong to the selected room type."}
                )
            if not room.is_available_for_range(attrs.get("check_in_date"), attrs.get("check_out_date")):
                raise serializers.ValidationError(
                    {"room_ids": f"Room {room.room_number} is no longer available for these dates."}
                )
        instance = Reservation(**{k: v for k, v in attrs.items() if k != "room_ids"})
        instance.clean_dates_and_quantity()
        return attrs

    def create(self, validated_data):
        room_ids = validated_data.pop("room_ids", [])
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["user"] = request.user
        reservation = super().create(validated_data)
        if room_ids:
            reservation.rooms.set(room_ids)
        return reservation


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