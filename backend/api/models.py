# Introspected / Supabase schema mirror — Lern-Domain + Django-System (ohne Auth/Profiles).
# Auth-Tabellen und `profiles` liegen in users.models (gleiche db_table, managed=False).
from django.db import models


class Answers(models.Model):
    id = models.UUIDField(primary_key=True)
    session = models.ForeignKey("QuizSessions", models.DO_NOTHING)
    question = models.ForeignKey("Questions", models.DO_NOTHING)
    participant = models.ForeignKey("SessionParticipants", models.DO_NOTHING)
    selected_option = models.TextField()
    is_correct = models.BooleanField()
    points_earned = models.IntegerField()
    response_time_ms = models.IntegerField(blank=True, null=True)
    answered_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "answers"
        unique_together = (("question", "participant"),)


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    

    class Meta:
        managed = False
        db_table = "django_content_type"
        unique_together = (("app_label", "model"),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey(
        DjangoContentType, models.DO_NOTHING, blank=True, null=True
    )
    user = models.ForeignKey("users.AuthUser", models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = "django_admin_log"


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "django_migrations"


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "django_session"


class CourseInvitations(models.Model):
    id = models.UUIDField(primary_key=True)
    course = models.ForeignKey("Courses", models.DO_NOTHING)
    invited_by = models.ForeignKey(
        "users.Profiles", models.DO_NOTHING, db_column="invited_by"
    )
    email = models.TextField()
    invite_token = models.TextField(unique=True)
    status = models.TextField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField()
    accepted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "course_invitations"
        unique_together = (("course", "email"),)


class CourseMembers(models.Model):
    pk = models.CompositePrimaryKey("course_id", "student_id")
    course = models.ForeignKey("Courses", models.DO_NOTHING)
    student = models.ForeignKey("users.Profiles", models.DO_NOTHING)
    joined_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "course_members"


class Courses(models.Model):
    id = models.UUIDField(primary_key=True)
    teacher = models.ForeignKey("users.Profiles", models.DO_NOTHING)
    name = models.TextField()
    semester = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "courses"


class Questions(models.Model):
    id = models.UUIDField(primary_key=True)
    quiz = models.ForeignKey("Quizzes", models.DO_NOTHING)
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
    id = models.UUIDField(primary_key=True)
    quiz = models.ForeignKey("Quizzes", models.DO_NOTHING)
    started_by = models.ForeignKey(
        "users.Profiles", models.DO_NOTHING, db_column="started_by"
    )
    current_question_index = models.IntegerField(blank=True, null=True)
    status = models.TextField()
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "quiz_sessions"


class Quizzes(models.Model):
    id = models.UUIDField(primary_key=True)
    course = models.ForeignKey(Courses, models.DO_NOTHING)
    teacher = models.ForeignKey("users.Profiles", models.DO_NOTHING)
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


class SessionParticipants(models.Model):
    id = models.UUIDField(primary_key=True)
    session = models.ForeignKey(QuizSessions, models.DO_NOTHING)
    user = models.ForeignKey("users.Profiles", models.DO_NOTHING, blank=True, null=True)
    guest_name = models.TextField(blank=True, null=True)
    total_score = models.IntegerField()
    joined_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "session_participants"
        unique_together = (("session", "user"),)
