/**
 * Страница создания ревизии
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useRevisionStore } from '../store/revisionStore';
import { theme } from '../styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button, ButtonGroup } from '../components/Button';
import { Input, Select, Label, FormGroup, Textarea } from '../components/Input';
import { referenceAPI } from '../services/api';

const Form = styled.form`
  max-width: 600px;
`;

export const RevisionCreatePage = () => {
  const navigate = useNavigate();
  const { createRevision, loading } = useRevisionStore();
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    location: '',
    revision_date: new Date().toISOString().split('T')[0],
    comments: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await referenceAPI.getLocations();
      setLocations(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки локаций:', error);
      alert('Не удалось загрузить список точек производства. Проверьте подключение к серверу.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация на клиенте
    if (!formData.location) {
      alert('Пожалуйста, выберите точку производства');
      return;
    }
    
    if (!formData.revision_date) {
      alert('Пожалуйста, выберите дату ревизии');
      return;
    }
    
    try {
      // Преобразуем location в число и убираем пустые поля
      const dataToSend = {
        location: parseInt(formData.location, 10),
        revision_date: formData.revision_date,
        ...(formData.comments && { comments: formData.comments }),
      };
      
      console.log('Отправка данных:', dataToSend);
      
      const revision = await createRevision(dataToSend);
      if (revision) {
        navigate(`/revisions/${revision.id}`);
      }
    } catch (error) {
      // Показываем детальную информацию об ошибке
      const errorData = error.response?.data;
      let errorMessage = 'Ошибка при создании ревизии';
      
      console.error('Полная ошибка:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      if (error.response?.status === 400) {
        if (errorData) {
          // Проверяем на ошибку уникальности
          if (errorData.non_field_errors) {
            errorMessage = `Ошибка: ${Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors.join(', ') : errorData.non_field_errors}`;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'object') {
            // Если это объект с ошибками валидации
            const errors = Object.entries(errorData)
              .map(([field, messages]) => {
                const fieldName = field === 'location' ? 'Точка производства' : 
                                 field === 'revision_date' ? 'Дата ревизии' : field;
                const messageText = Array.isArray(messages) ? messages.join(', ') : String(messages);
                return `${fieldName}: ${messageText}`;
              })
              .join('\n');
            errorMessage = `Ошибки валидации:\n${errors}`;
          } else {
            errorMessage = String(errorData);
          }
        }
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'Ошибка авторизации. Пожалуйста, войдите в систему.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Создать новую ревизию</CardTitle>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Точка производства *</Label>
              <Select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              >
                <option value="">Выберите точку производства</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.title}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Дата ревизии *</Label>
              <Input
                type="date"
                value={formData.revision_date}
                onChange={(e) => setFormData({ ...formData, revision_date: e.target.value })}
                placeholder="Выберите дату ревизии"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Комментарии</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Дополнительные комментарии к ревизии..."
              />
            </FormGroup>

            <ButtonGroup>
              <Button
                type="button"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать ревизию'}
              </Button>
            </ButtonGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
