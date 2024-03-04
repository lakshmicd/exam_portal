from django.shortcuts import render, redirect
from django.views import View
from .forms import StudentForm, StudentInfoForm
from django.contrib.auth.decorators import login_required
from django.contrib import auth
from django.contrib import messages
from django.contrib.sites.shortcuts import get_current_site
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.urls import reverse
from django.utils.encoding import force_bytes
from .utils import account_activation_token
from django.core.mail import EmailMessage
import threading
from django.contrib.auth.models import User
from studentPreferences.models import StudentPreferenceModel
from django.contrib.auth.models import Group

class EmailThread(threading.Thread):
    def __init__(self, email):
        self.email = email
        threading.Thread.__init__(self)

    def run(self):
        self.email.send(fail_silently=False)

@login_required(login_url='login')
def index(request):
    return render(request, 'student/index.html')

class Register(View):
    def get(self, request):
        student_form = StudentForm()
        student_info_form = StudentInfoForm()
        return render(request, 'student/register.html', {'student_form': student_form, 'student_info_form': student_info_form})

    def post(self, request):
        student_form = StudentForm(data=request.POST)
        student_info_form = StudentInfoForm(data=request.POST)
        email = request.POST.get('email', '')

        if student_form.is_valid() and student_info_form.is_valid():
            student = student_form.save()
            student.set_password(student.password)
            student.is_active = False

            my_group, _ = Group.objects.get_or_create(name='Student')
            my_group.user_set.add(student)
            student.save()

            uidb64 = urlsafe_base64_encode(force_bytes(str(student.pk)))
            domain = get_current_site(request).domain
            link = reverse('activate', kwargs={'uidb64': uidb64, 'token': account_activation_token.make_token(student)})
            activate_url = 'http://' + domain + link

            email_subject = 'Activate your Exam Portal account'
            email_body = f'Hi. Please use this link to verify your account\n{activate_url}.\n\n You are receiving this message because you registered on {domain}. If you didn\'t register please contact support team on {domain}'

            from_email = 'noreply@exam.com'
            email = EmailMessage(email_subject, email_body, from_email, [email])

            student_info = student_info_form.save(commit=False)
            student_info.user = student

            if 'picture' in request.FILES:
                student_info.picture = request.FILES['picture']

            student_info.save()
            messages.success(request, 'Registered Successfully. Check Email for confirmation')
            EmailThread(email).start()

            return redirect('login')
        else:
            print(student_form.errors, student_info_form.errors)
            return render(request, 'student/register.html',
                          {'student_form': student_form, 'student_info_form': student_info_form})

class LoginView(View):
    def get(self, request):
        return render(request, 'student/login.html')

    def post(self, request):
        username = request.POST.get('username', '')
        password = request.POST.get('password', '')

        if username and password:
            try:
                user_ch = User.objects.get(username=username)
                if user_ch.is_staff:
                    messages.error(request, "You are trying to login as a student, but you have registered as faculty. We are redirecting you to faculty login. If you are having problems logging in, please reset your password or contact admin")
                    return redirect('faculty-login')
            except User.DoesNotExist:
                user_ch = None

            user = auth.authenticate(username=username, password=password)

            if user:
                if user.is_active:
                    auth.login(request, user)
                    student_pref = StudentPreferenceModel.objects.filter(user=request.user).exists()
                    email = User.objects.get(username=username).email

                    email_subject = 'You Logged into your Portal account'
                    email_body = "If you think someone else logged in. Please contact support or reset your password.\n\nYou are receiving this message because you have enabled login email notifications in portal settings. If you don't want to receive such emails in the future please turn off the login email notifications in settings."

                    from_email = 'noreply@exam.com'
                    email = EmailMessage(email_subject, email_body, from_email, [email])

                    if student_pref:
                        student = StudentPreferenceModel.objects.get(user=request.user)
                        send_email = student.sendEmailOnLogin

                    if not student_pref or send_email:
                        EmailThread(email).start()

                    messages.success(request, f'Welcome, {user.username}. You are now logged in.')
                    return redirect('index')

            else:
                user_n = User.objects.filter(username=username).exists()
                if user_n:
                    user_v = User.objects.get(username=username)
                    if user_v.is_active:
                        messages.error(request, 'Invalid credentials')
                        return render(request, 'student/login.html')
                    else:
                        messages.error(request, 'Account not Activated')
                        return render(request, 'student/login.html')

        messages.error(request, 'Please fill all fields')
        return render(request, 'student/login.html')

class LogoutView(View):
    def post(self, request):
        auth.logout(request)
        messages.success(request, 'Logged Out')
        return redirect('login')

class VerificationView(View):
    def get(self, request, uidb64, token):
        try:
            id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=id)
            if not account_activation_token.check_token(user, token):
                messages.error(request, "User already Activated. Please Proceed With Login")
                return redirect("login")
            if user.is_active:
                return redirect('login')
            user.is_active = True
            user.save()
            messages.success(request, 'Account activated Successfully')
            return redirect('login')
        except Exception as e:
            raise e
        return redirect('login')
