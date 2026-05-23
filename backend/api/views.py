import uuid

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from users.models import Profiles

from .models import CourseMembers, Courses
from .serializers import CourseSerializer


class CourseListCreateView(generics.ListCreateAPIView):
    """
    GET: Kurse des Nutzers (als Lehrende:r oder als Mitglied).
    POST: Neuer Kurs (nur Rolle teacher); teacher/zeiten werden serverseitig gesetzt.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CourseSerializer

    def get_queryset(self):
        user = self.request.user
        profile = Profiles.objects.filter(email__iexact=user.email).first()
        if profile is None:
            return Courses.objects.none()

        member_ids = CourseMembers.objects.filter(student=profile).values_list(
            "course_id", flat=True
        )
        return (
            Courses.objects.filter(Q(teacher=profile) | Q(id__in=member_ids))
            .distinct()
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        profile = Profiles.objects.filter(email__iexact=self.request.user.email).first()
        if profile is None:
            raise PermissionDenied("Kein Profil für dieses Konto.")
        if profile.role != "teacher":
            raise PermissionDenied("Nur Lehrkräfte können Kurse anlegen.")

        now = timezone.now()
        serializer.save(
            teacher=profile,
            id=uuid.uuid4(),
            created_at=now,
            updated_at=now,
        )
