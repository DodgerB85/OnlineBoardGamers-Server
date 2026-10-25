from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import (
    PasswordChangeForm,
    PasswordResetForm,
    SetPasswordForm,
    UserCreationForm,
)
from django.utils.translation import gettext_lazy

from .models import Profile, changelog

User = get_user_model()


# Create your forms here.
class changelogForm(forms.ModelForm):
    class Meta:
        model = changelog
        fields = ["update"]
        # fields = "__all__"


class SetPasswordFormCustom(SetPasswordForm):
    new_password1 = forms.CharField(
        max_length=100,
        label="",
        widget=forms.PasswordInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy("Password"),
            }
        ),
    )
    new_password2 = forms.CharField(
        max_length=100,
        label="",
        widget=forms.PasswordInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy("Confirm Password"),
            }
        ),
    )


class PasswordResetFormCustom(PasswordResetForm):
    email = forms.EmailField(
        max_length=200,
        help_text="",
        label="",
        widget=forms.TextInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy("Email Address"),
                "id": "some_id",
            }
        ),
    )


class PasswordChangeCustomForm(PasswordChangeForm):
    def __init__(self, user, *args, **kwargs):
        super().__init__(user, *args, **kwargs)
        self.fields["old_password"].widget.attrs.update(
            {"class": "registerInput", "placeholder": gettext_lazy("Old Password")}
        )
        self.fields["new_password1"].widget.attrs.update(
            {"class": "registerInput", "placeholder": gettext_lazy("New Password")}
        )
        self.fields["new_password2"].widget.attrs.update(
            {
                "class": "registerInput",
                "placeholder": gettext_lazy("Confirm New Password"),
            }
        )
        self.fields["old_password"].widget.attrs.pop("autofocus", None)

        self.fields["old_password"].label = ""
        self.fields["new_password1"].label = ""
        self.fields["new_password2"].label = ""


class NewUserForm(UserCreationForm):
    username = forms.CharField(
        max_length=100,
        label="",
        widget=forms.TextInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy(
                    "Username - This will be your in-game Name"
                ),
            }
        ),
    )
    email = forms.EmailField(
        max_length=200,
        help_text="",
        label="",
        widget=forms.TextInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy(
                    "Email Address - Required for Account Activation"
                ),
                "id": "some_id",
            }
        ),
        error_messages={
            "invalid": "Please enter a valid email address",
        },
    )

    password1 = forms.CharField(
        max_length=100,
        label="",
        widget=forms.PasswordInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy("Password"),
            }
        ),
    )
    password2 = forms.CharField(
        max_length=100,
        label="",
        widget=forms.PasswordInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy("Confirm Password"),
            }
        ),
    )

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        if commit:
            user.save()
        return user


class UpdateProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ["sendEmailNotificationOnTurn"]
