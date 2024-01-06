from django.shortcuts import render


# Create your views here.
def homepage_view(request):
    return render(request, 'homepage.html')

def s_login_view(request):
    return render(request,'student/login.html')

def f_login_view(request):
    return render(request,'faculty/login.html')

def s_register_view(request):
    return render(request,'student/register.html')

def s_reset_pass(request):
    return render(request,'student/resetPassword.html')

def s_reset_done(request):
    return render(request,'student/resetPasswordDone.html')

def f_login_view(request):
    return render(request,'student/resetPasswordSent.html')

def s_new_pass(request):
    return render(request,'student/setNewPassword')

def f_login_view(request):
    return render(request,'faculty/login.html')

def f_login_view(request):
    return render(request,'faculty/login.html')

def f_login_view(request):
    return render(request,'faculty/login.html')

