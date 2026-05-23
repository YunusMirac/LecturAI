from rest_framework import serializers

from .models import Courses


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courses
        fields = "__all__"
        read_only_fields = ("id", "teacher", "created_at", "updated_at")
