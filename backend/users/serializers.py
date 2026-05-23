import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from users.models import Profiles

User = get_user_model()

ROLE_STUDENT = "student"
ROLE_TEACHER = "teacher"
ALLOWED_ROLES = (ROLE_STUDENT, ROLE_TEACHER)


class RegisterSerializer(serializers.Serializer):
    """Registrierung: schreibt `auth_user` (Django) + Zeile in `profiles` (Supabase / api.models)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=[(r, r) for r in ALLOWED_ROLES],
        default=ROLE_STUDENT,
        required=False,
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwörter stimmen nicht überein."}
            )
        validate_password(attrs["password"])
        email = attrs["email"].strip().lower()
        attrs["email"] = email

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "Diese E-Mail ist bereits registriert."}
            )
        if Profiles.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "Diese E-Mail ist bereits registriert."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        role = validated_data.get("role", ROLE_STUDENT)
        now = timezone.now()

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_active=False,
        )

        Profiles.objects.create(
            id=uuid.uuid4(),
            email=email,
            role=role,
            created_at=now,
            updated_at=now,
        )
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login mit E-Mail + Passwort; nur verifizierte (`is_active`) Nutzer."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("username", None)
        self.fields["email"] = serializers.EmailField()

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed(
                "Kein Konto mit dieser E-Mail oder falsches Passwort."
            ) from exc

        if not user.check_password(password):
            raise AuthenticationFailed(
                "Kein Konto mit dieser E-Mail oder falsches Passwort."
            )
        if not user.is_active:
            raise AuthenticationFailed(
                "Bitte bestätige zuerst deine E-Mail über den Link in der Nachricht."
            )

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
