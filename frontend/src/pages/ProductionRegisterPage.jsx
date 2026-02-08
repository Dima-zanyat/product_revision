/**
 * Регистрация производства по инвайт-ссылке
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Label, FormGroup } from '../components/Input';
import { theme } from '../styles/theme';

export const ProductionRegisterPage = () => {
  const { token } = useParams();
  const [form, setForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    name: '',
    city: '',
    legal_name: '',
    inn: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register({ ...form, token });
      setSuccess(true);
    } catch (error) {
      alert('Ошибка регистрации: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Регистрация завершена</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Производство зарегистрировано. Теперь можно войти под созданным пользователем.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Регистрация производства</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: theme.spacing.md }}>Данные менеджера</h3>
          <FormGroup>
            <Label>Логин</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Пароль</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Имя</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </FormGroup>
          <FormGroup>
            <Label>Фамилия</Label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </FormGroup>
          <FormGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormGroup>

          <h3 style={{ margin: `${theme.spacing.lg} 0 ${theme.spacing.md}` }}>Данные производства</h3>
          <FormGroup>
            <Label>Название пекарни</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Город</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Название ИП</Label>
            <Input
              value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>ИНН (необязательно)</Label>
            <Input
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
            />
          </FormGroup>
          <Button variant="primary" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрировать'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
