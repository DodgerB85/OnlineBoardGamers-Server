from django.contrib import admin

from .models import RNBmap


# Register your models here.
@admin.register(RNBmap)
class RNBmapAdmin(admin.ModelAdmin):
    list_display = ('name', 'playerCount', 'isOfficial', 'id')
    list_filter = ('playerCount', 'isOfficial')
    search_fields = ('name', 'description')
    readonly_fields = ('id',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'playerCount')
        }),
        ('Map Data', {
            'fields': ('hexData', 'customElements')
        }),
        ('Settings', {
            'fields': ('isOfficial', 'highscores')
        }),
        ('System', {
            'fields': ('id',),
            'classes': ('collapse',)
        })
    )
