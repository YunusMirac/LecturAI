from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from users.models import Invitation
from api.permissions import IsAdmin, IsTeacher, profile_for_user

from .serializers import (
    EmailTokenObtainPairSerializer,
    InvitationCreateSerializer,
    InvitationCreatedSerializer,
    RegisterSerializer,
)
from .invitations import create_student_invitation, create_teacher_invitation


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterView(APIView):
    """
    Whitelist-Registrierung: `invite_token` Pflicht, Rolle aus `invitations`.
    Kein freies Selbst-Signup ohne Einladung.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": "Registrierung erfolgreich. Du kannst dich jetzt anmelden.",
            },
            status=status.HTTP_201_CREATED,
        )


class InvitationCreateView(APIView):
    """
    POST /api/invitations/
    - Admin: { "email", "role": "teacher" } — plattformweite Lehrer-Einladung.
    - Lehrer: { "email", "role": "student", "course_id" } — Schüler:in in den Kurs.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitations"

    def post(self, request):
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = profile_for_user(request.user)
        if profile is None:
            raise PermissionDenied("Kein Profil für dieses Konto.")

        role = serializer.validated_data["role"]
        email = serializer.validated_data["email"]
        course_id = serializer.validated_data.get("course_id")

        try:
            if role == Invitation.Role.TEACHER:
                if not IsAdmin().has_permission(request, self):
                    raise PermissionDenied("Nur Admins dürfen Lehrkräfte einladen.")
                inv = create_teacher_invitation(invited_by=profile, email=email)
            else:
                if not IsTeacher().has_permission(request, self):
                    raise PermissionDenied("Nur Lehrkräfte dürfen Schüler:innen einladen.")
                if course_id is None:
                    raise ValidationError({"course_id": "course_id ist erforderlich."})
                inv = create_student_invitation(
                    invited_by=profile,
                    email=email,
                    course_id=course_id,
                )
        except PermissionDenied:
            raise
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        return Response(
            InvitationCreatedSerializer(inv).data,
            status=status.HTTP_201_CREATED,
        )
