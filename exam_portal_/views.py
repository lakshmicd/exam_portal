from django.shortcuts import render


# Create your views here.
def homepage_view(request):
    return render(request, 'homepage.html')

def login_view(request):
    return render(request,'student/login.html')