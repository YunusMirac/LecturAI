from django.shortcuts import render
from rest_framework import generics
from .models import Courses
from .serializers import CourseSerializer

# Diese View kann Kurse auflisten (GET) und neue erstellen (POST)
class CourseListCreateView(generics.ListCreateAPIView):
    queryset = Courses.objects.all()
    serializer_class = CourseSerializer