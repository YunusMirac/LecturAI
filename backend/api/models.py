"""
Unmanaged ORM-Spiegel für das Supabase-PostgreSQL-Schema (Source of Truth: SQL in Supabase).

Alle `Meta.managed = False` — Django erzeugt/ändert diese Tabellen nicht.
Änderungen am Schema nur per Supabase-Migrationen; Models hier manuell synchron halten.

Hinweis: `profiles` und `invitations` liegen in `users.models` (Nutzer-App).
"""

from __future__ import annotations

import uuid

from django.db import models


# --- Django-System (nur für FK aus auth_permission) ---------------------------------


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = "django_content_type"
        unique_together = (("app_label", "model"),)


# --- LecturAI: Kurse & Lerninhalt (Profile: users.models.Profiles) -----------------


class Courses(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        "users.Profiles",
        models.DO_NOTHING,
        db_column="teacher_id",
        related_name="courses_teaching",
    )
    name = models.TextField()
    semester = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "courses"


class CourseMembers(models.Model):
    """Tabelle `course_members` — Composite Primary Key (course_id, student_id)."""

    pk = models.CompositePrimaryKey("course_id", "student_id")
    course = models.ForeignKey(
        Courses,
        models.DO_NOTHING,
        db_column="course_id",
        related_name="memberships",
    )
    student = models.ForeignKey(
        "users.Profiles",
        models.DO_NOTHING,
        db_column="student_id",
        related_name="course_memberships",
    )
    joined_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "course_members"


class Quizzes(models.Model):
    class Mode(models.TextChoices):
        CLOSED = "closed", "Closed"
        OPEN = "open", "Open"

    class Status(models.TextChoices):
        INACTIVE = "inactive", "Inactive"
        ACTIVE = "active", "Active"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Courses,
        models.DO_NOTHING,
        db_column="course_id",
        related_name="quizzes",
    )
    teacher = models.ForeignKey(
        "users.Profiles",
        models.DO_NOTHING,
        db_column="teacher_id",
        related_name="quizzes_owned",
    )
    title = models.TextField()
    description = models.TextField(blank=True, null=True)
    mode = models.TextField()
    status = models.TextField()
    pin_code = models.TextField(blank=True, null=True)
    num_questions = models.IntegerField(blank=True, null=True)
    num_options = models.IntegerField(blank=True, null=True)
    time_per_question = models.IntegerField(blank=True, null=True)
    show_leaderboard = models.BooleanField(blank=True, null=True)
    source_filename = models.TextField(blank=True, null=True)
    storage_file_path = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "quizzes"


class Questions(models.Model):
    class CorrectOption(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        D = "D", "D"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(
        Quizzes,
        models.DO_NOTHING,
        db_column="quiz_id",
        related_name="questions",
    )
    text = models.TextField()
    options = models.JSONField()
    correct_option = models.TextField()
    explanation = models.TextField(blank=True, null=True)
    order_index = models.IntegerField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "questions"


class QuizSessions(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        RUNNING = "running", "Running"
        FINISHED = "finished", "Finished"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(
        Quizzes,
        models.DO_NOTHING,
        db_column="quiz_id",
        related_name="sessions",
    )
    started_by = models.ForeignKey(
        "users.Profiles",
        models.DO_NOTHING,
        db_column="started_by",
        related_name="quiz_sessions_started",
    )
    current_question_index = models.IntegerField(blank=True, null=True)
    status = models.TextField()
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "quiz_sessions"


class SessionParticipants(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        QuizSessions,
        models.DO_NOTHING,
        db_column="session_id",
        related_name="participants",
    )
    user = models.ForeignKey(
        "users.Profiles",
        models.DO_NOTHING,
        db_column="user_id",
        blank=True,
        null=True,
        related_name="quiz_participations",
    )
    guest_name = models.TextField(blank=True, null=True)
    total_score = models.IntegerField()
    joined_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "session_participants"
        unique_together = (("session", "user"),)


class Answers(models.Model):
    class OptionLetter(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        D = "D", "D"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        QuizSessions,
        models.DO_NOTHING,
        db_column="session_id",
        related_name="answers",
    )
    question = models.ForeignKey(
        Questions,
        models.DO_NOTHING,
        db_column="question_id",
        related_name="answers",
    )
    participant = models.ForeignKey(
        SessionParticipants,
        models.DO_NOTHING,
        db_column="participant_id",
        related_name="answers",
    )
    selected_option = models.TextField()
    is_correct = models.BooleanField()
    points_earned = models.IntegerField()
    response_time_ms = models.IntegerField(blank=True, null=True)
    answered_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "answers"
        unique_together = (("question", "participant"),)
