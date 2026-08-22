from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RoomType, Reservation, Promo
from .serializers import (
    RoomTypeSerializer,
    ReservationSerializer,
    RegisterSerializer,
    UserSerializer,
    PromoSerializer,
)


# ---------------------------------------------------------------------------
# Promos
# ---------------------------------------------------------------------------

class PromoViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only: customers see active promos here, but only staff (via
    Django Admin) can add/edit/remove them or reorder via display_order."""

    queryset = Promo.objects.filter(is_active=True)
    serializer_class = PromoSerializer
    permission_classes = [permissions.AllowAny]


# ---------------------------------------------------------------------------
# Rooms
# ---------------------------------------------------------------------------

class RoomTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only: customers browse rooms here, but only staff (via Django
    Admin) can create/edit/delete room types."""

    queryset = RoomType.objects.filter(is_active=True).prefetch_related("amenities", "images")
    serializer_class = RoomTypeSerializer
    lookup_field = "slug"
    permission_classes = [permissions.AllowAny]


# ---------------------------------------------------------------------------
# Reservations
# ---------------------------------------------------------------------------

class ReservationCreateView(generics.CreateAPIView):
    """POST /api/reservations/ — works for both guest checkout and logged-in
    users. If a valid auth token is sent, the reservation gets linked to
    that user automatically (handled in the serializer)."""

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [permissions.AllowAny]


class MyReservationsView(generics.ListAPIView):
    """GET /api/reservations/my/ — only for logged-in users."""

    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related("room_type")


class ReservationLookupView(generics.RetrieveAPIView):
    """GET /api/reservations/lookup/<code>/ — lets a guest with no account
    check their booking status using the code they were given at checkout."""

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    lookup_field = "reservation_code"
    lookup_url_kwarg = "code"
    permission_classes = [permissions.AllowAny]


class CancelReservationView(APIView):
    """POST /api/reservations/<id>/cancel/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk, user=request.user)
        if reservation.status not in [Reservation.Status.PENDING, Reservation.Status.CONFIRMED]:
            return Response(
                {"detail": "This reservation can no longer be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        return Response(ReservationSerializer(reservation).data)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    """POST /api/auth/register/"""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/auth/login/ — expects { email, password }."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        # We store email as the username (see RegisterSerializer.create),
        # so authenticate() is called with username=email under the hood.
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class MeView(APIView):
    """GET /api/auth/me/ — returns the currently logged-in user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)