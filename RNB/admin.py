from django.contrib import admin
from django import forms

from .models import RNBmap, RNBMapScore


class RNBMapScoreForm(forms.ModelForm):
    game = forms.ModelChoiceField(
        queryset=None,
        required=True,
        help_text="Select an RNB game (searchable by ID, name, or description)"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Limit game choices to RNB games only
        from Lobby.models import Game
        self.fields['game'].queryset = Game.objects.filter(gameCode='RNB').order_by('-id')

    class Meta:
        model = RNBMapScore
        fields = '__all__'


# Register your models here.
@admin.register(RNBmap)
class RNBmapAdmin(admin.ModelAdmin):
    list_display = ('name', 'playerCount', 'isVerified', 'id')
    list_filter = ('playerCount', 'isVerified')
    search_fields = ('name', 'description')
    autocomplete_fields = ("creator",)
    readonly_fields = ('id',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'playerCount')
        }),
        ('Map Data', {
            'fields': ('hexData', 'uniqueID', 'isVerified', 'creator')
        }),
        ('System', {
            'fields': ('id',),
            'classes': ('collapse',)
        })
    )

@admin.register(RNBMapScore)
class RNBMapScoreAdmin(admin.ModelAdmin):
    form = RNBMapScoreForm
    list_display = ('user', 'map_ref', 'score', 'timeStamp', 'game_display')
    list_filter = ('map_ref', 'user', 'game')
    search_fields = ('user__username', 'map_ref__name', 'score')
    ordering = ('-score', 'timeStamp')
    autocomplete_fields = ['user']

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related('user', 'map_ref', 'game')
        )

    @admin.display(description='Game', ordering='game__gameName')
    def game_display(self, obj):
        return str(obj.game) if obj.game else '-'
