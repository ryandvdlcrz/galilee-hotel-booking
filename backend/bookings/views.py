from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth.models import User
from .models import UserProfile

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


class ReservationLookupView(APIView):
    """POST /api/reservations/lookup/ — lets a guest with no account check
    their booking status using the reservation code AND the email they
    booked with (both must match, so a code alone isn't enough)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = request.data.get("reservation_code", "").strip()
        email = request.data.get("email", "").strip()

        if not code or not email:
            return Response(
                {"detail": "Please provide both your reservation code and email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reservation = Reservation.objects.filter(
            reservation_code__iexact=code, guest_email__iexact=email
        ).first()

        if not reservation:
            return Response(
                {"detail": "We couldn't find a reservation matching that code and email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(ReservationSerializer(reservation).data)


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


class GoogleLoginView(APIView):
    """POST /api/auth/google/ — expects { credential } (the ID token from Google)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            return Response({"detail": "Missing Google credential."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_400_BAD_REQUEST)
        
        email = idinfo.get("email")
        if not email:
            return Response({"detail": "Google account has no email."}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": idinfo.get("given_name", ""),
                "last_name": idinfo.get("family_name", ""),
            },
        )
        if created:
            UserProfile.objects.create(user=user)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})
    
class MeView(APIView):
    """GET /api/auth/me/ — returns the currently logged-in user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)