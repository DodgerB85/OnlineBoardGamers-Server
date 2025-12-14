from .models import Profile
from django import forms


from django.contrib.auth.forms import UserCreationForm
from django.utils.safestring import mark_safe

from django.utils.translation import gettext, gettext_lazy

from django.contrib.auth import get_user_model
User = get_user_model()
from .models import changelog

from django.contrib.auth.forms import PasswordChangeForm,PasswordResetForm,SetPasswordForm



# Create your forms here.
class changelogForm(forms.ModelForm):
        class Meta:
                model = changelog
                fields = ['update']    
                #fields = "__all__"


class SetPasswordFormCustom(SetPasswordForm):

    new_password1 = forms.CharField(max_length=100, label='',
                                widget=forms.PasswordInput
                                (attrs={'class': 'registerInput',
                                        'placeholder': gettext_lazy("Password"),
                                        })
                                )
    new_password2 = forms.CharField(max_length=100, label='',
                                widget=forms.PasswordInput
                                (attrs={'class': 'registerInput',
                                        'placeholder': gettext_lazy("Confirm Password"),
                                        })
                                )

class PasswordResetFormCustom(PasswordResetForm):
    email = forms.EmailField(max_length=200, help_text='', label='',
                             widget=forms.TextInput
                             (attrs={'class': 'registerInput',
                                     'placeholder': gettext_lazy("Email Address"),
                                     'id': 'some_id'})
                             )

class PasswordChangeCustomForm(PasswordChangeForm):
    def __init__(self, user, *args, **kwargs):
        super(PasswordChangeCustomForm, self).__init__(user, *args, **kwargs)
        self.fields['old_password'].widget.attrs.update({'class': 'registerInput', 'placeholder': gettext_lazy("Old Password")})
        self.fields['new_password1'].widget.attrs.update({'class': 'registerInput', 'placeholder': gettext_lazy("New Password")})
        self.fields['new_password2'].widget.attrs.update({'class': 'registerInput', 'placeholder': gettext_lazy("Confirm New Password")})
        self.fields['old_password'].widget.attrs.pop("autofocus", None)

        self.fields['old_password'].label = ''
        self.fields['new_password1'].label = ''
        self.fields['new_password2'].label = ''

class NewUserForm(UserCreationForm):
    username = forms.CharField(max_length=100, label='',
                               widget=forms.TextInput
                               (attrs={'class': 'registerInput',
                                       'placeholder': gettext_lazy("Username - This will be your in-game Name")})
                               )
    email = forms.EmailField(max_length=200, help_text='', label='',
                             widget=forms.TextInput
                             (attrs={'class': 'registerInput',
                                     'placeholder': gettext_lazy("Email Address - Required for Account Activation"),
                                     'id': 'some_id'}),
                                error_messages={'invalid': 'Please enter a valid email address',}
                             )

    password1 = forms.CharField(max_length=100, label='',
                                widget=forms.PasswordInput
                                (attrs={'class': 'registerInput',
                                        'placeholder': gettext_lazy("Password"),
                                        })
                                )
    password2 = forms.CharField(max_length=100, label='',
                                widget=forms.PasswordInput
                                (attrs={'class': 'registerInput',
                                        'placeholder': gettext_lazy("Confirm Password"),
                                        })
                                )


    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def save(self, commit=True):
        user = super(NewUserForm, self).save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user


class UpdateProfileForm(forms.ModelForm):

    restaurantChoices = (
        (-1, mark_safe('None'
                       )),
        (0, mark_safe('<div class="column"><img src="/static/FCM/Images/p_fried_geese.jpg" alt="Fried Geese" title="Fried Geese"></div>'
                       )),
        (1, mark_safe('<div class="column"><img src="/static/FCM/Images/p_gluttony_inc.jpg" alt="Gluttony Inc" title="Gluttony Inc"></div>'
                       )),
        (2, mark_safe('<div class="column"><img src="/static/FCM/Images/p_duck_dinner.jpg" alt="Duck Diner" title="Duck Diner"></div>'
                       )),
        (3, mark_safe('<div class="column"><img src="/static/FCM/Images/p_santa_maria.jpg" alt="Santa Maria" title="Santa Maria"></div>'
                       )),
        (4, mark_safe('<div class="column"><img src="/static/FCM/Images/p_xango_blues.jpg" alt="Xango Blues" title="Xango Blues"></div>'
                       )),
        (5, mark_safe('<img src="/static/FCM/Images/p_siap_faji.jpg" alt="Siap Faji" title="Siap Faji">'
                       )),
    )

    preferredRestaurantColour = forms.ChoiceField(choices=restaurantChoices,
                                                  initial=0,
                                                  widget=forms.RadioSelect,
                                                  )

    class Meta:
        model = Profile
        fields = ['preferredRestaurantColour',
                  'sendEmailNotificationOnTurn']
