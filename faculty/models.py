from django.db import models

# Create your models here.
class Faculty(models.Model):
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    profile_pic = models.FileField(upload_to='faculty_pics', default='default_faculty.jpg')
    department = models.CharField(max_length=255)
    designation = models.CharField(max_length=255)
    mobile = models.CharField(max_length=255)

    def __str__(self):
        return self.full_name