/**
 * Страница номенклатуры (справочник ингредиентов).
 */

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { FormGroup, Input, Label, Select } from '../components/Input';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHeader,
    TableHeaderCell,
    TableRow,
} from '../components/Table';
import { ingredientsAPI, referenceAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { theme } from '../styles/theme';

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const FilterGroup = styled.div`
  flex: 1 1 280px;
  min-width: 220px;
`;

const CreateForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: flex-end;
  width: 100%;
`;

const ErrorText = styled.p`
  color: ${theme.colors.danger};
  margin: ${theme.spacing.sm} 0 0;
`;

const UNIT_OPTIONS = [
  { value: 'g', label: 'Граммы' },
  { value: 'kg', label: 'Килограммы' },
  { value: 'l', label: 'Литры' },
  { value: 'pcs', label: 'Штуки' },
];

export const NomenclaturePage = () => {
  const { user } = useAuthStore();
  const [ingredients, setIngredients] = useState([]);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({ title: '', unit: 'g' });
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [editingForm, setEditingForm] = useState({ title: '', unit: 'g' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = user?.role === 'manager' || user?.is_superuser;

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const response = await referenceAPI.getIngredients();
      setIngredients(response.data?.results || response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки номенклатуры:', err);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Введите название ингредиента.');
      return;
    }

    setSaving(true);

    try {
      const response = await ingredientsAPI.create({
        title: formData.title.trim(),
        unit: formData.unit,
      });
      setIngredients((prev) => [response.data, ...prev]);
      setFormData({ title: '', unit: 'g' });
    } catch (err) {
      console.error('Ошибка создания ингредиента:', err);
      setError('Не удалось создать ингредиент. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ingredient) => {
    setEditingIngredientId(ingredient.id);
    setEditingForm({ title: ingredient.title, unit: ingredient.unit });
    setError('');
  };

  const cancelEdit = () => {
    setEditingIngredientId(null);
    setEditingForm({ title: '', unit: 'g' });
    setError('');
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingForm.title.trim()) {
      setError('Введите название ингредиента.');
      return;
    }

    setSaving(true);

    try {
      const response = await ingredientsAPI.update(editingIngredientId, {
        title: editingForm.title.trim(),
        unit: editingForm.unit,
      });
      setIngredients((prev) => prev.map((item) => (
        item.id === editingIngredientId ? response.data : item
      )));
      cancelEdit();
    } catch (err) {
      console.error('Ошибка обновления ингредиента:', err);
      setError('Не удалось сохранить изменения. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    if (!window.confirm('Удалить позицию номенклатуры?')) {
      return;
    }

    setSaving(true);

    try {
      await ingredientsAPI.delete(id);
      setIngredients((prev) => prev.filter((item) => item.id !== id));
      if (editingIngredientId === id) {
        cancelEdit();
      }
    } catch (err) {
      console.error('Ошибка удаления ингредиента:', err);
      setError('Не удалось удалить позицию. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const filteredIngredients = ingredients.filter((item) =>
    item.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Номенклатура</CardTitle>
      </CardHeader>
      <CardContent>
        <Controls>
          <FilterGroup>
            <FormGroup>
              <Label>Поиск</Label>
              <Input
                placeholder="По названию ингредиента"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </FormGroup>
          </FilterGroup>
          {canEdit && (
            <CreateForm onSubmit={handleCreate}>
              <FormGroup style={{ flex: '1 1 240px', minWidth: 220 }}>
                <Label>Название ингредиента</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например, Мука"
                />
              </FormGroup>
              <FormGroup style={{ width: 160 }}>
                <Label>Единица</Label>
                <Select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  {UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <Button type="submit" variant="success" disabled={saving}>
                {saving ? 'Сохраняем...' : 'Создать'}
              </Button>
              {error && <ErrorText>{error}</ErrorText>}
            </CreateForm>
          )}
        </Controls>

        {loading && <p>Загрузка...</p>}

        {!loading && filteredIngredients.length === 0 && (
          <p style={{ color: theme.colors.textLight }}>
            {filter ? 'По запросу ничего не найдено.' : 'Номенклатура пока пуста.'}
          </p>
        )}

        {!loading && filteredIngredients.length > 0 && (
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>ID</TableHeaderCell>
                  <TableHeaderCell>Название</TableHeaderCell>
                  <TableHeaderCell>Единица</TableHeaderCell>
                  <TableHeaderCell>Создано</TableHeaderCell>
                  {canEdit && <TableHeaderCell>Действия</TableHeaderCell>}
                </tr>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell>{ingredient.id}</TableCell>
                    <TableCell>
                      {editingIngredientId === ingredient.id ? (
                        <Input
                          value={editingForm.title}
                          onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                        />
                      ) : (
                        ingredient.title
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIngredientId === ingredient.id ? (
                        <Select
                          value={editingForm.unit}
                          onChange={(e) => setEditingForm({ ...editingForm, unit: e.target.value })}
                        >
                          {UNIT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        ingredient.unit_display || ingredient.unit
                      )}
                    </TableCell>
                    <TableCell>{new Date(ingredient.created_at).toLocaleString('ru-RU')}</TableCell>
                    {canEdit && (
                      <TableCell>
                        {editingIngredientId === ingredient.id ? (
                          <>
                            <Button type="button" variant="success" onClick={handleSaveEdit} disabled={saving}>
                              Сохранить
                            </Button>
                            <Button type="button" variant="default" onClick={cancelEdit}>
                              Отмена
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" variant="primary" onClick={() => startEdit(ingredient)}>
                              Изменить
                            </Button>
                            <Button type="button" variant="danger" onClick={() => handleDelete(ingredient.id)} disabled={saving}>
                              Удалить
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
