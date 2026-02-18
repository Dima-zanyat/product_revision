/**
 * Страница поступлений
 */

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { incomingAPI, referenceAPI } from '../services/api';
import { theme } from '../styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button, ButtonGroup } from '../components/Button';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell, TableContainer } from '../components/Table';
import { Modal } from '../components/Modal';
import { Input, Select, Label, FormGroup, Textarea } from '../components/Input';

const Filters = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.lg};
`;

export const IncomingListPage = () => {
  const [incomingItems, setIncomingItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [filters, setFilters] = useState({
    location: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    fetchIncoming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.location, filters.date_from, filters.date_to]);

  const loadReferenceData = async () => {
    try {
      const [ingredientsRes, locationsRes] = await Promise.all([
        referenceAPI.getIngredients(),
        referenceAPI.getLocations(),
      ]);
      setIngredients(ingredientsRes.data?.results || ingredientsRes.data || []);
      setLocations(locationsRes.data?.results || locationsRes.data || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };

  const fetchIncoming = async () => {
    setLoading(true);
    try {
      const params = {
        ...(filters.location && { location: filters.location }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      };
      const response = await incomingAPI.getAll(params);
      setIncomingItems(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки поступлений:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ingredient: formData.ingredient,
        quantity: formData.quantity,
        location: formData.location,
        date: formData.date,
        comment: formData.comment || '',
      };
      if (editing) {
        await incomingAPI.update(editing.id, payload);
      } else {
        await incomingAPI.create(payload);
      }
      setShowModal(false);
      setEditing(null);
      setFormData({});
      fetchIncoming();
    } catch (error) {
      alert('Ошибка при сохранении поступления: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      ingredient: item.ingredient,
      quantity: item.quantity,
      location: item.location,
      date: item.date,
      comment: item.comment || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить поступление?')) return;
    try {
      await incomingAPI.delete(id);
      fetchIncoming();
    } catch (error) {
      alert('Ошибка при удалении поступления: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Поступления</CardTitle>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Добавить поступление
          </Button>
        </CardHeader>
        <CardContent>
          <Filters>
            <FormGroup style={{ minWidth: 220 }}>
              <Label>Точка производства</Label>
              <Select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              >
                <option value="">Все точки</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.title}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Дата с</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                placeholder="Начало периода"
              />
            </FormGroup>
            <FormGroup>
              <Label>Дата по</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                placeholder="Конец периода"
              />
            </FormGroup>
            <ButtonGroup style={{ alignItems: 'flex-end' }}>
              <Button onClick={() => setFilters({ location: '', date_from: '', date_to: '' })}>
                Сбросить
              </Button>
            </ButtonGroup>
          </Filters>

          {loading && <p>Загрузка...</p>}

          {incomingItems.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Позиция номенкулатуры</TableHeaderCell>
                    <TableHeaderCell>Количество (граммы)</TableHeaderCell>
                    <TableHeaderCell>Ед. изм.</TableHeaderCell>
                    <TableHeaderCell>Точка</TableHeaderCell>
                    <TableHeaderCell>Дата</TableHeaderCell>
                    <TableHeaderCell>Комментарии</TableHeaderCell>
                    <TableHeaderCell>Действия</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {incomingItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ingredient_title}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit_display}</TableCell>
                      <TableCell>{item.location_title}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.comment || '-'}</TableCell>
                      <TableCell>
                        <ButtonGroup>
                          <Button
                            variant="default"
                            onClick={() => handleEdit(item)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(item.id)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            🗑️
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <p style={{ color: theme.colors.textLight }}>Поступления не найдены</p>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
          setFormData({});
        }}
        title={editing ? 'Редактировать поступление' : 'Добавить поступление'}
        footer={
          <>
            <Button onClick={() => {
              setShowModal(false);
              setEditing(null);
              setFormData({});
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editing ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <FormGroup>
            <Label>Позиция номенкулатуры</Label>
            <Select
              value={formData.ingredient || ''}
              onChange={(e) => setFormData({ ...formData, ingredient: e.target.value })}
              required
            >
              <option value="">Выберите ингредиент</option>
              {ingredients.map(i => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Количество (граммы)</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
              placeholder="Введите количество в граммах"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Точка производства</Label>
            <Select
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            >
              <option value="">Выберите точку</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.title}</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Дата</Label>
            <Input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              placeholder="Выберите дату поступления"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Комментарии</Label>
            <Textarea
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Добавьте комментарий (необязательно)"
            />
          </FormGroup>
        </form>
      </Modal>
    </div>
  );
};
