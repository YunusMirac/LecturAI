import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from api.models import CourseMembers, Courses
from api.permissions import profile_for_user
from users.models import Invitation, Profiles

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    """
    Whitelist-Registrierung: nur mit gültigem `invite_token` aus `invitations`.
    Rolle kommt ausschließlich aus der Einladung (teacher/student → Profil).
    """

    invite_token = serializers.CharField(write_only=True, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwörter stimmen nicht überein."}
            )
        validate_password(attrs["password"])
        email = attrs["email"].strip().lower()
        attrs["email"] = email

        token = attrs["invite_token"].strip()
        if not token:
            raise serializers.ValidationError(
                {"invite_token": "Einladungstoken ist erforderlich."}
            )

        inv = Invitation.objects.filter(invite_token=token).first()
        if inv is None or inv.status != Invitation.Status.PENDING:
            raise serializers.ValidationError(
                {"invite_token": "Ungültiges oder bereits verwendetes Einladungstoken."}
            )
        if inv.expires_at < timezone.now():
            raise serializers.ValidationError(
                {"invite_token": "Die Einladung ist abgelaufen."}
            )
        if inv.email.strip().lower() != email:
            raise serializers.ValidationError(
                {"email": "E-Mail muss exakt der eingeladenen Adresse entsprechen."}
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "Diese E-Mail ist bereits registriert."}
            )
        if Profiles.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "Diese E-Mail ist bereits registriert."}
            )

        attrs["_invitation"] = inv
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        inv: Invitation = validated_data["_invitation"]

        inv = Invitation.objects.select_for_update().get(pk=inv.pk)
        if inv.status != Invitation.Status.PENDING:
            raise serializers.ValidationError(
                {"invite_token": "Einladung wurde bereits verwendet."}
            )

        if inv.role == Invitation.Role.STUDENT:
            profile_role = Profiles.Role.STUDENT
        else:
            profile_role = Profiles.Role.TEACHER

        now = timezone.now()
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_active=True,
        )

        pid = uuid.uuid4()
        Profiles.objects.create(
            id=pid,
            email=email,
            role=profile_role,
            created_at=now,
            updated_at=now,
        )

        inv.status = Invitation.Status.ACCEPTED
        inv.accepted_at = now
        inv.save(update_fields=["status", "accepted_at"])

        if inv.role == Invitation.Role.STUDENT and inv.course_id is not None:
            CourseMembers.objects.create(
                course=Courses.objects.get(pk=inv.course_id),
                student=Profiles.objects.get(pk=pid),
                joined_at=now,
            )

        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login mit E-Mail + Passwort; nur aktive Nutzer (`is_active`)."""

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
                "Dieses Konto ist deaktiviert. Bitte Support kontaktieren."
            )

        refresh = self.get_token(user)
        profile = profile_for_user(user)
        role = profile.role if profile is not None else None
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "email": user.email.strip(),
            "role": role,
        }


class InvitationCreateSerializer(serializers.Serializer):
    """Payload zum Erzeugen einer Einladung (Admin → Lehrer, Lehrer → Schüler)."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Invitation.Role.choices)
    course_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        role = attrs["role"]
        course_id = attrs.get("course_id")
        if role == Invitation.Role.STUDENT and course_id is None:
            raise serializers.ValidationError(
                {"course_id": "Für Schüler:innen-Einladungen ist course_id erforderlich."}
            )
        if role == Invitation.Role.TEACHER and course_id is not None:
            raise serializers.ValidationError(
                {"course_id": "Bei Lehrer-Einladungen darf kein Kurs angegeben werden."}
            )
        return attrs


class InvitationCreatedSerializer(serializers.ModelSerializer):
    """Antwort inkl. Token (nur direkt nach Erstellung sichtbar)."""

    class Meta:
        model = Invitation
        fields = (
            "id",
            "email",
            "role",
            "course_id",
            "invite_token",
            "status",
            "expires_at",
            "created_at",
        )
