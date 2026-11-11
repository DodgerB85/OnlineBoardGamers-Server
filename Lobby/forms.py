from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import (
    PasswordChangeForm,
    PasswordResetForm,
    SetPasswordForm,
    UserCreationForm,
)
from django.utils.translation import gettext_lazy

from Lobby.sharedFunctions.constants import RESERVED_USERNAMES_CASEFOLD

from .models import Profile, changelog

User = get_user_model()


class UsernameValidationMixin:
    """Shared username rules for registration, social signup and profile changes."""

    def clean_username(self):
        username = (self.cleaned_data.get("username") or "").strip()
        if not username:
            raise forms.ValidationError(gettext_lazy("Enter a username"))
        if username.casefold() in RESERVED_USERNAMES_CASEFOLD:
            raise forms.ValidationError(gettext_lazy("That username is reserved"))
        taken = User.objects.filter(username__iexact=username)
        if self.instance.pk:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise forms.ValidationError(gettext_lazy("Username already taken"))
        return username


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


class NewUserForm(UsernameValidationMixin, UserCreationForm):
    username = forms.CharField(
        max_length=100,
        label=gettext_lazy("Username"),
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
        label=gettext_lazy("Email Address"),
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
        label=gettext_lazy("Password"),
        widget=forms.PasswordInput(
            attrs={
                "class": "registerInput",
                "placeholder": gettext_lazy("Password"),
            }
        ),
    )
    password2 = forms.CharField(
        max_length=100,
        label=gettext_lazy("Confirm Password"),
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


class ChooseUsernameForm(UsernameValidationMixin, forms.ModelForm):
    class Meta:
        model = User
        fields = ["username"]


class ChangeUsernameForm(UsernameValidationMixin, forms.ModelForm):
    username = forms.CharField(
        max_length=150,
        label=gettext_lazy("New username"),
        widget=forms.TextInput(
            attrs={
                "class": "registerInput",
                "autocomplete": "username",
            }
        ),
    )

    class Meta:
        model = User
        fields = ["username"]


class UpdateProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ["sendEmailNotificationOnTurn"]
