from django.db import models

# Create your models here.
from django.db import models

class Student(models.Model):
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    profile_pic = models.FileField(upload_to='student_pics', default='default_student.jpg')
    roll_number = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    semester = models.IntegerField()
    mobile = models.CharField(max_length=255)

    def __str__(self):
        return self.full_name
