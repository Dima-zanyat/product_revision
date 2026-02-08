"""
Serializers для приложения users.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Production

User = get_user_model()


class ProductionSerializer(serializers.ModelSerializer):
    """Serializer для Production."""

    class Meta:
        model = Production
        fields = ('id', 'name', 'city', 'legal_name', 'inn', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class UserSerializer(serializers.ModelSerializer):
    """Serializer для пользователей."""

    password = serializers.CharField(write_only=True, required=False)
    production = serializers.PrimaryKeyRelatedField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'production', 'created_by', 'password', 'created_at'
        )
        read_only_fields = ('created_at',)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
