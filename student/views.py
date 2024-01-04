from django.shortcuts import render
from student.views import *

# Create your views here.
def homepage(request):
    return render(request, 'index.html')

def login(request)