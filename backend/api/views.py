import uuid

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from api.models import CourseMembers, Courses
from users.models import Profiles
from api.permissions import profile_for_user
from api.serializers import CourseSerializer


class CourseListCreateView(generics.ListCreateAPIView):
    """
    GET: Kurse (Lehrkraft: eigene; Mitglied: eingeschrieben; Admin: alle).
    POST: Neuer Kurs (nur Lehrkraft).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CourseSerializer

    def get_queryset(self):
        user = self.request.user
        profile = profile_for_user(user)
        if profile is None:
            return Courses.objects.none()

        if profile.role == Profiles.Role.ADMIN:
            return Courses.objects.all().order_by("-updated_at")

        member_ids = CourseMembers.objects.filter(student=profile).values_list(
            "course_id", flat=True
        )
        return (
            Courses.objects.filter(Q(teacher=profile) | Q(id__in=member_ids))
            .distinct()
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        profile = profile_for_user(self.request.user)
        if profile is None:
            raise PermissionDenied("Kein Profil für dieses Konto.")
        if profile.role != Profiles.Role.TEACHER:
            raise PermissionDenied("Nur Lehrkräfte können Kurse anlegen.")

        now = timezone.now()
        serializer.save(
            teacher=profile,
            id=uuid.uuid4(),
            created_at=now,
            updated_at=now,
        )
