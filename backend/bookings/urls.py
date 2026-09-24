from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RoomTypeViewSet,
    PromoViewSet,
    ReservationCreateView,
    MyReservationsView,
    ReservationLookupView,
    CancelReservationView,
    RegisterView,
    LoginView,
    MeView,
)

router = DefaultRouter()
router.register("room-types", RoomTypeViewSet, basename="room-type")
router.register("promos", PromoViewSet, basename="promo")

urlpatterns = [
    path("", include(router.urls)),

    # Reservations
    path("reservations/", ReservationCreateView.as_view(), name="reservation-create"),
    path("reservations/my/", MyReservationsView.as_view(), name="reservation-my"),
    path("reservations/lookup/", ReservationLookupView.as_view(), name="reservation-lookup"),
    path("reservations/<int:pk>/cancel/", CancelReservationView.as_view(), name="reservation-cancel"),

    # Auth
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
]